// ==UserScript==
// @name         OpenAI.js
// @namespace    http://tampermonkey.net/
// @version      0.0.1
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

(function () {
    "use strict";
    console.log("OpenAI.user.js Loaded.");
    get_available_models({ endpoint: LLM_ENDPOINT }).then((models) => {
        console.log("models:", models);
    });
})();
