// ==UserScript==
// @name         OpenAI-js
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Tampermonkey user script for chatting with LLM endpoints in OpenAI format
// @author       Hansimov
// @icon         https://raw.githubusercontent.com/Hansimov/openai-js/master/penrose.png
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const LLM_ENDPOINT = "https://hansimov-hf-llm-api.hf.space/api";

const decoder = new TextDecoder("utf-8");
function stringify_stream_bytes(bytes) {
    return decoder.decode(bytes);
}
function jsonize_stream_data(data) {
    var json_chunks = [];
    data = data
        .replace(/^data:\s*/gm, "")
        .replace(/\[DONE\]/gm, "")
        .split("\n")
        .filter(function (line) {
            return line.trim().length > 0;
        })
        .map(function (line) {
            try {
                let json_chunk = JSON.parse(line.trim());
                json_chunks.push(json_chunk);
            } catch {
                console.log(`Failed to parse: ${line}`);
            }
        });
    return json_chunks;
}

async function process_stream_response(response, on_chunk) {
    let reader = response.response.getReader();
    let content = "";

    while (true) {
        let { done, value } = await reader.read();
        if (done) {
            break;
        }
        let json_chunks = jsonize_stream_data(stringify_stream_bytes(value));
        for (let json_chunk of json_chunks) {
            let chunk = json_chunk.choices[0];
            if (on_chunk) {
                content += on_chunk(chunk);
            }
        }
    }
    return content;
}

let p = document.createElement("p");
p.id = "response";
document.body.appendChild(p);
let response_element = document.getElementById("response");

function on_chunk(chunk) {
    let delta = chunk.delta;
    if (delta.role) {
        // console.log("role:", delta.role);
    }
    if (delta.content) {
        // console.log("content:", delta.content);
        response_element.innerHTML += delta.content;
        return delta.content;
    }
    if (chunk.finish_reason === "stop") {
        console.log("[Finished]");
    }
    return "";
}

function get_llm_models({ endpoint } = {}) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: endpoint + "/v1/models",
            headers: {
                "Content-Type": "application/json",
            },
            onload: function (response) {
                let data = JSON.parse(response.responseText);
                let models = data.data.map((item) => item.id);
                resolve(models);
            },
            onerror: function (error) {
                reject(error);
            },
        });
    });
}

function chat_completions({
    messages,
    endpoint = LLM_ENDPOINT,
    model = "mixtral-8x7b",
    max_tokens = -1,
    temperature = 0.5,
    top_p = 0.95,
    stream = false,
} = {}) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: endpoint + "/v1/chat/completions",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            data: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: max_tokens,
                temperature: temperature,
                top_p: top_p,
                stream: stream,
            }),
            responseType: stream ? "stream" : "json",
            onloadstart: function (response) {
                if (stream) {
                    resolve(response);
                }
            },
            onload: function (response) {
                if (!stream) {
                    let data = JSON.parse(response.responseText);
                    let content = data.choices[0].message.content;
                    resolve(content);
                }
            },
            onerror: function (error) {
                reject(error);
            },
        });
    });
}

// Main function
(function () {
    "use strict";
    window.get_llm_models = get_llm_models;
    window.chat_completions = chat_completions;
    console.log("+ Plugin loaded: OpenAI-js");
})();

// Usage:

// ===== Get LLM models ====== //

// get_llm_models({ endpoint: LLM_ENDPOINT }).then((models) => {
//     console.log("models:", models);
// });

// ====== Chat completions ====== //

// let prompt = "who are you?";
// console.log("prompt", prompt);

// === stream is false === //

// chat_completions({
//     messages: [{ role: "user", content: prompt }],
//     model: "mixtral-8x7b",
//     stream: false,
// }).then((content) => {
//     console.log("content:", content);
// });

// === stream is true === //

// chat_completions({
//     messages: [{ role: "user", content: prompt }],
//     model: "mixtral-8x7b",
//     stream: true,
// }).then((response) => {
//     process_stream_response(response, on_chunk).then((content) => {
//         console.log(content);
//     });
// });
