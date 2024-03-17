// ==UserScript==
// @name         OpenAI.js
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Tampermonkey user script for chatting with LLM endpoints in OpenAI format
// @author       Hansimov
// @icon         https://www.google.com/s2/favicons?sz=64&domain=0.1
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
                // TODO: Single line broken into multiple chunks
                let json_chunk = JSON.parse(line.trim());
                json_chunks.push(json_chunk);
            } catch {
                console.log(`Failed to parse: ${line}`);
            }
        });
    return json_chunks;
}

function get_available_models({ endpoint } = {}) {
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
    on_chunk = null, // callback when stream is true
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
            onload: function (response) {
                if (stream) {
                    let stream_reader = response.response;
                    let reader = stream_reader.getReader();
                    let content = "";
                    reader.read().then(function process_text({ done, value }) {
                        if (done) {
                            resolve(content);
                            return;
                        }
                        let json_chunks = jsonize_stream_data(
                            stringify_stream_bytes(value)
                        );
                        for (let chunk of json_chunks) {
                            chunk = chunk.choices[0];
                            if (on_chunk) {
                                content += on_chunk(chunk);
                            }
                        }
                        reader.read().then(process_text);
                    });
                } else {
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

(function () {
    "use strict";
    console.log("OpenAI.user.js Loaded.");
    get_available_models({ endpoint: LLM_ENDPOINT }).then((models) => {
        console.log("models:", models);
    });
    let prompt = "Hello, who are you?";
    console.log("prompt:", prompt);
    chat_completions({
        messages: [{ role: "user", content: prompt }],
        model: "mixtral-8x7b",
        stream: true,
        on_chunk: (chunk) => {
            let delta = chunk.delta;
            if (delta.role) {
                console.log("role:", delta.role);
            }
            if (delta.content) {
                console.log("content:", delta.content);
                return delta.content;
            }
            if (chunk.finish_reason === "stop") {
                console.log("[Finished]");
            }
            return "";
        },
    }).then((content) => {
        console.log("content:", content);
    });
})();
