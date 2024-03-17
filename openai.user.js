// ==UserScript==
// @name         OpenAI.js
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Tampermonkey user script for chatting with LLM endpoints in OpenAI format
// @author       Hansimov
// @icon         https://www.google.com/s2/favicons?sz=64&domain=0.1
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const LLM_ENDPOINT = "https://hansimov-hf-llm-api.hf.space/api";

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
} = {}) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "POST",
            url: endpoint + "/v1/chat/completions",
            headers: {
                "Content-Type": "application/json",
            },
            data: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: max_tokens,
                temperature: temperature,
                top_p: top_p,
                stream: stream,
            }),
            onload: function (response) {
                let data = JSON.parse(response.responseText);
                let content = data.choices[0].message.content;
                resolve(content);
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
    }).then((content) => {
        console.log("content:", content);
    });
})();
