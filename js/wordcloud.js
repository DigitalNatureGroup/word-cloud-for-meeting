/* jshint esversion: 6  */
/* exported vr_function */
/* global d3, kuromoji            */
/* global webkitSpeechRecognition */


/**
 * Data on words and the number of times they are said.
 * ``elapsed`` is the elapsed time since the last appearance. The larger the value, the older the word.
 * @type {{elapsed: number, count: number, word: string}[]}
 */
let wordCountData = [
    {"word": "", "count": 1, "elapsed": 1}
];


/**
 * Words not to be added to the word cloud
 * @type {string[]}
 */
let stopWords = ["てる", "いる", "なる", "れる", "する", "ある", "こと", "これ",
    "さん", "して", "くれる", "やる", "くださる", "そう", "せる", "した", "思う",
    "それ", "ここ", "ちゃん", "くん", "", "て", "に", "を", "は", "ん",
    "の", "が", "と", "た", "し", "で", "ない", "も", "な", "い", "か", "ので", "よう", "", "*", "いい",
    "まあ", "かも", "くる", "からい", "さ", "っぽい", "あと", "ため", "られる",
    "わけ", "しまう", "ける", "てる子", "あれ", "ば", "あれ", "やつ"];


/**
 * Create a new word cloud instance on the element specified here (targetElement).
 * @type {string}
 */
let targetElement = "#wordcloud";


/**
 * Object of the word cloud.
 * @type {{update: update}}
 */
let wordCloud = makeCloud(targetElement);

// Speech recognition-related settings
let flag_speech = 0;


/**
 * Deliver a continuous speech recognition.
 * https://jellyware.jp/kurage/iot/webspeechapi.html
 */
function vr_function() {
    // Chrome requires the webkit prefix.
    window.SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;

    // Looking to see the structure of the recognition results returned, look at this:
    // https://qiita.com/hmmrjn/items/4b77a86030ed0071f548
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "ja";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onsoundstart = function () {
        document.getElementById("status").innerHTML = "recognizing";
    };
    recognition.onnomatch = function () {
        document.getElementById("status").innerHTML = "please try again";
    };
    recognition.onerror = function () {
        document.getElementById("status").innerHTML = "error";
        if(flag_speech === 0){
            vr_function();
        }
    };
    recognition.onsoundend = function () {
        document.getElementById("status").innerHTML = "stop";
        vr_function();
    };

    // The following function is executed on completion of the speech.
    recognition.onresult = function (event) {
        const results = event.results;
        for (let i = event.resultIndex; i < results.length; i++) {
            if (results[i].isFinal) {
                updateWordCountData(results[i][0].transcript);
                document.getElementById("result_text").innerHTML = results[i][0].transcript;
                vr_function();
            } else {
                document.getElementById("result_text").innerHTML = "[interim] " + results[i][0].transcript;
                flag_speech = 1;
            }
        }
    };
    flag_speech = 0;
    document.getElementById("status").innerHTML = "ready";
    document.getElementById("status").className = "ready";
    recognition.start();
}


/**
 * Create an svg element at the destination specified by selector and draw the word cloud there.
 * ref： https://gist.github.com/joews/9697914
 * @param selector
 * @returns {{update: update}}
 */
function makeCloud(selector) {
    // Get the size of the browser display area
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    // Create an svg element for drawing word clouds
    let svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    function draw(words) {
        const cloud = svg.selectAll("g text")
            .data(words, function (d) {
                return d.text;
            });

        const elapsedMax = d3.max(words, function (d) {
            return d.elapsed;
        });
        const elapsedScale = d3.scaleLinear().domain([0, elapsedMax]).range([0, 1]);

        // cloud.enter(), transition(),and exit() are used for animation.
        // ref: http://deep-blend.com/jp/2014/05/d3js-basic7-transition-animation/

        // New words to be added are displayed with a font size of 1.
        cloud.enter()
            .append("text")
            .style("font-family", "Hiragino Kaku Gothic Std")
            .style("fill", function (d, i) {
                return d3.interpolateViridis(elapsedScale(d.elapsed));
            })
            .attr("text-anchor", "middle")
            .attr("font-size", 1)
            .text(function (d) {
                return d.text;
            })
            .transition()
            .duration(2000)
            .style("font-size", function (d) {
                return d.size + "px";
            })
            .attr("transform", function (d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("fill-opacity", 1);

        // Specify the final size and rotation of the word to be displayed successively.
        cloud.transition()
            .style("fill", function (d, i) {
                return d3.interpolateViridis(elapsedScale(d.elapsed));
            })
            .duration(2000)
            .style("font-size", function (d) {
                return d.size + "px";
            })
            .attr("transform", function (d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("fill-opacity", 1);

        // The word to be erased is set to font size 1 and made transparent.
        cloud.exit()
            .transition()
            .duration(2000)
            .style("fill-opacity", 1e-6)
            .attr("font-size", 1)
            .remove();

    }

    return {
        update: function (words) {
            // Create a new instance of a word cloud layout
            // the source and document: https://github.com/jasondavies/d3-cloud
            d3.layout.cloud().size([width, height])
                .words(words)
                .padding(5)
                .rotate(function () {
                    return ~~(Math.random() * 2) * 90;
                })
                .font("Impact")
                .fontSize(function (d) {
                    // default: Math.sqrt(d.value)
                    return d.size;
                })
                .on("end", draw)
                .start();
        }
    };
}


/**
 * Determines the font sizes for each word in the argument ``data``.
 * @param data
 * @returns {*|Uint8Array|BigInt64Array|{size, text}[]|Float64Array|Int8Array|Float32Array|Int32Array|Uint32Array|Uint8ClampedArray|BigUint64Array|Int16Array|Uint16Array}
 */
function getWordArray(data) {
    // Set maxFontSize and minFontSize to the font size of the most and least frequent words
    const maxFontSize = 130;
    const minFontSize = 10;

    // Returns the maximum value of the counts. d3.max(data, function(){}) is described below.
    // https://qiita.com/nyasu1111/items/bef2d26800748a3661ec#d3maxarray-accessor
    const countMax = d3.max(data, function (d) {
        return d.count;
    });
    const sizeScale = d3.scaleLinear().domain([0, countMax]).range([minFontSize, maxFontSize]);

    // Determine the font size for all words between minFontSize and maxFontSize.
    return data.map(function (d) {
        return {
            text: d.word,
            size: sizeScale(d.count),
            elapsed: d.elapsed
        };
    });
}


/**
 * Update the word cloud based on ``wordCountData``.
 * @param cloud
 */
function redraw(cloud) {
    cloud.update(getWordArray(wordCountData));
}

/**
 * Redraw / update the spoken words and their count data ``wordCountData``.
 * @param text
 */
function updateWordCountData(text) {
    // Morphological analysis of speech analysis results
    kuromoji.builder({dicPath: "kuromoji.js/dict"}).build(function (err, tokenizer) {
        if (err) {
            console.log(err);
        } else {
            let tokens = tokenizer.tokenize(text);
            tokens.forEach(function (word) {
                // Check the part of speech ``pos`` and basic form of a word.
                let pos = word["pos"];
                let basic = word["basic_form"];

                // Stop words (a list of words you do not want to include in the word cloud) will not be counted.
                if (stopWords.includes(basic)) {
                    return;
                }

                // For nouns, verbs, adjectives, and adverbs, either increase the count or add the word as a new occurrence.
                if (pos === "名詞" || pos === "動詞" || pos === "形容詞" || pos === "副詞") {
                    for (let i = 0; i < wordCountData.length; i++) {

                        // If it's a word already spoken.
                        if (wordCountData[i]["word"] === basic) {
                            wordCountData[i]["count"] += 1;
                            wordCountData[i]["elapsed"] = 0;
                            break;
                        }

                        // If it's a new word.
                        if (i === wordCountData.length - 1) {
                            wordCountData.push({"word": basic, "count": 1, "elapsed": 0});
                        }
                    }
                }
            });

            let countSum = 0;
            for (let i = 0; i < wordCountData.length; i++) {
                wordCountData[i]["elapsed"] += 1;
                countSum += wordCountData[i]["count"];
            }

            // If the sum of the weights of the currently displayed words is greater than 50, the old words are erased.
            if (countSum > 40) {
                // ref for d3.max():
                // https://qiita.com/nyasu1111/items/bef2d26800748a3661ec#d3maxarray-accessor
                let maxElapsedTime = d3.max(wordCountData, function(d) {
                    return d.elapsed;
                });

                // ref: https://qiita.com/sirogane/items/b9ee2f829148b5d949f7
                wordCountData = wordCountData.filter(element => element["elapsed"] < maxElapsedTime);
            }
            console.log(countSum);

            redraw(wordCloud);
        }
    });
}