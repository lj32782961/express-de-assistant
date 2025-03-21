let settings;
let currentIndex;
let Schluessel;


// let temperature; //设置温度 (范围通常为 0.0 - 1.0)
// let topP; //设置 Top-P (范围通常为 0.0 - 1.0)
// let topK; //设置 Top-K (通常为正整数)
import { GoogleGenerativeAI } from 'https://esm.run/@google/generative-ai';
let model_name = "gemini-2.0-flash";
let max_token = 100000;
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];// 加载历史
// console.log(chatHistory);
const safetySettings = [{
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE"
},
{
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE"
},
{
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE"
},
{
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE"
},
{
    category: "HARM_CATEGORY_CIVIC_INTEGRITY",
    threshold: "BLOCK_NONE"
}];

// 页面初始化时加载
document.addEventListener('DOMContentLoaded', loadSettings);
let isSettingsLoaded = false; // 添加标志位，表示 settings 是否加载完成
async function loadSettings() {
    try {
        const response = await fetch('/settings', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!response.ok) {
            console.error('获取settings数据失败:', response.status, response.statusText);
            sendButton.disabled = true;
            isSettingsLoaded = false;
            return; // 退出函数，不再尝试解析 JSON
        }
        const data = await response.json();
        if (data.settings_values) {
            settings = data.settings_values;
            settings = settings.split(',');
            console.log('Length: ' + settings.length);
            sendButton.disabled = false;
            isSettingsLoaded = true; // 设置标志位
        } else {
            sendButton.disabled = true; // 禁用发送按钮
        }
    } catch (error) {
        console.error('获取settings数据:', error);
        sendButton.disabled = true; // 禁用发送按钮
        isSettingsLoaded = false;
    }
};

// 页面加载时加载localstorage数据
document.addEventListener('DOMContentLoaded', loadChatHistory);
function loadChatHistory() {
    if (chatHistory.length === 0) {
        console.log("没有历史记录可加载");
        return;
    }

    // 清空当前聊天区域（可选）
    chatMessages.innerHTML = '';

    // 遍历历史记录并插入
    chatHistory.forEach((entry) => {
        const role = entry.role === "user" ? "user" : "ai";
        const text = entry.parts[0].text; // 假设每条消息只有一个 part
        // 如果是用户消息且包含“<fullcommand>”，跳过显示
        if (role === "user" && text.includes("<fullcommand>")) {
            return; // 跳过这条记录
        }
        //其他不受影响
        updateChat(role, text);
    });

    // 滚动到底部（或根据需求调整）
    chatMessages.scrollTop = chatMessages.scrollHeight;
    console.log("聊天历史已加载，共 " + chatHistory.length + " 条记录");
}

// temperature（0.0 - 1.0）：控制输出的随机性。
// 低值（例如 0.3）：更确定、更可预测的输出，适合翻译。
// 高值（例如 0.9）：更多样、更具创意的输出，适合故事或对话。
// topP（0.0 - 1.0）：控制输出的多样性（核采样）。
// 低值（例如 0.7）：限制生成范围，适合精确任务。
// 高值（例如 0.95）：增加多样性，适合创意任务。
// topK（正整数）：控制考虑的词汇范围。
// 低值（例如 20）：更聚焦，适合翻译。
// 高值（例如 50）：更多选择，适合创意生成。
const commands = [
    {
        label: "中-英-德互译",
        content: "请自动帮我检测单引号中内容的语言（中文，英文，德语中的一种），并自动翻译成另外两种语言并给出该对应语言的例句以及例句的中文翻译。按照以下格式输出：\n检测到的语言：中文 \n**翻译：** \n* **英文:** stapler \n* **例句:** I need a stapler to fasten these papers together. 我需要一个订书机来把这些纸订在一起。\n* **德文:** Hefter \n* **例句:** Der Hefter ist kaputt. 订书机坏了。",
        placeholder: "请输入要翻译的文本...",
        Temperature: '0.3',// 翻译任务需要更高的确定性
        topP: '0.7',
        topK: '20'
    },
    {
        label: "德语故事",
        content: "请根据单引号中的关键词帮我用德语写一个A1-B1水平的故事，主题围绕关键词，并以我为第一视角。故事需要简单易懂，情节完整，并自然地包含与关键词相关的词汇和表达方式。 请避免使用复杂的语法结构和生僻词汇。 故事长度大约为300字。 每句德语结束后（以句号或者问号等符号为结束标志），请在这句德语的下面另起一行提供相应的中文（不需要英文的）翻译以便帮助我理解。另外，在故事结束后提供一些你认为重点的词汇和短语，并给出2个例句及其中文翻译，以便我更好地理解其含义和用法。请严格按照输出指令来输出。",
        placeholder: "请输入故事关键词...",
        Temperature: '0.9',// 创意任务需要更多多样性
        topP: '0.95',
        topK: '50'
    },
    {
        label: "德语对话",
        content: "请根据单引号中的关键词帮我用德语写一个A1-B1水平的对话（其他人（Lukas或Linda）问，我（Herr Li）回答），主题围绕关键词。对话需要简单易懂（如果可能，请偏向日常口语化而非书面化），情节完整，并自然地包含与关键词相关的词汇和表达方式。 请避免使用复杂的语法结构和生僻词汇。 对话长度大约为300字。 每句德语结束后（以句号或者问号等符号为结束标志），请在这句德语的下面另起一行提供相应的中文（不需要英文的）翻译以便帮助我理解。另外，在故事结束后提供一些你认为重点的词汇和短语，并给出2个例句及其中文翻译，以便我更好地理解其含义和用法。请严格按照输出指令来输出。",
        placeholder: "请输入对话关键词...",
        Temperature: '0.9',// 创意任务需要更多多样性
        topP: '0.95',
        topK: '50'
    },
    {
        label: "中译德",
        content: "请将单引号中的中文短文翻译成德语，翻译水平应为A1-B1，避免使用生僻词汇和复杂的语法结构。 在每句中文下面一行附上对应的德语句子。请严格按照输出指令来输出。",
        placeholder: "请输入要翻译的中文...",
        Temperature: '0.3',// 翻译任务需要更高的确定性
        topP: '0.7',
        topK: '20'
    },
    {
        label: "词汇精讲",
        content: "单引号中的是上面文章（对话）中的一些词汇，我不理解其含义和用法。请用简明易懂的【中文】解释它们的含义，并尽可能提供德语例句（例句难度控制在A1-B1水平）来说明其在不同语境下的用法。如果某个词有多种含义，请分别解释。",
        placeholder: "请输入要解释的词汇...",
        Temperature: '0.3',// 翻译任务需要更高的确定性
        topP: '0.7',
        topK: '20'
    },
    {
        label: "润色德语邮件",
        content: "单引号中的是一封德语邮件，请帮我检查。过国有格式，语法，语气以及其他错误，指出并给出改正版",
        placeholder: "输入德语邮件",
        Temperature: '0.8',// 翻译任务需要更高的确定性
        topP: '0.8',
        topK: '30'
    },
    {
        label: "其他",
        content: "\n请用中文回答。",
        placeholder: "这里可以随便输入点什么...",
        Temperature: '0.5',// 这里一般是写代码或者问一些一般的问题
        topP: '0.7',
        topK: '30'
    },
    {
        label: "清除历史对话",
        content: "清除历史对话",
        placeholder: "点击下方《发送》按钮确认清除历史对话，并自动刷新页面",
        Temperature: '0.5',// 这里一般是写代码或者问一些一般的问题
        topP: '0.7',
        topK: '30'
    },
];

document.addEventListener('DOMContentLoaded', () => {
    createCommandButtons(commands);
});

let activeButton = null;
// 创建按钮的函数
function createCommandButtons(commands) {
    const buttonContainer = document.getElementById('commandButtons');

    commands.forEach(command => {
        if (command.label === '--') return;

        const button = document.createElement('button');
        button.className = 'command-button';
        button.textContent = command.label;
        button.addEventListener('click', () => {
            // 取消其他按钮的激活状态
            document.querySelectorAll('.command-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // 设置当前按钮为激活状态
            button.classList.add('active');
            activeButton = command;

            // 更新输入框的 placeholder
            userInput.placeholder = command.placeholder;

            // 如果是清除历史对话按钮，立即处理
            if (command.label === '清除历史对话') {
                if (confirm('这会删除当前以及之前的所有会话内容，确定吗？')) {
                    localStorage.clear();
                    location.reload(true);
                    // alert("历史对话已删除");
                }
                // 重置 activeButton
                button.classList.remove('active');
                activeButton = null;
                userInput.placeholder = ''; // 重置 placeholder
            }
        });
        buttonContainer.appendChild(button);
    });
}


let recognition; // 语音识别对象
let isRecording = false;
const userInput = document.getElementById("userInput");
const microphoneButton = document.getElementById('microphoneButton');
const stopButton = document.getElementById('stopButton');
// 检查浏览器是否支持语音识别 API
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // 持续识别
    recognition.interimResults = true; // 显示临时结果
    recognition.lang = 'zh-CN'; // 设置语言为中文，提高识别准确率

    recognition.onstart = () => {
        isRecording = true;
        microphoneButton.classList.add('recording'); // 添加动画
        stopButton.classList.remove('hidden'); //显示停止按钮
        console.log('语音识别已启动');
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ',';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // 将新的识别结果添加到输入框的现有内容中
        userInput.value += finalTranscript;
        // userInput.value += interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error('语音识别出错:', event.error);
        stopRecording();

        let errorMessage = '语音识别出错: ';
        switch (event.error) {
            case 'no-speech':
                errorMessage += '未检测到语音.';
                break;
            case 'aborted':
                errorMessage += '语音识别被中止.';
                break;
            case 'audio-capture':
                errorMessage += '无法访问麦克风.';
                break;
            case 'network':
                errorMessage += '网络连接错误.';
                break;
            case 'not-allowed':
                errorMessage += '没有麦克风权限，请检查浏览器设置.';
                break;
            case 'service-not-allowed':
                errorMessage += '语音识别服务不允许.';
                break;
            default:
                errorMessage += '未知错误.';
        }
        // apiResponseTextarea.value = errorMessage; // 将错误信息显示在API响应区域
    };

    recognition.onend = () => {
        isRecording = false;
        microphoneButton.classList.remove('recording'); // 移除动画
        stopButton.classList.add('hidden'); //隐藏停止按钮
        console.log('语音识别已结束');
    };


    // 封装语音识别的启动和停止功能
    function toggleSpeechRecognition() {
        if (!isRecording) {
            // 开始录音
            userInput.value = ''; // 录音前清空输入框
            recognition.start();
        } else {
            // 停止录音
            recognition.stop();
        }
    }

    // 为话筒和停止按钮绑定同一个事件处理函数
    microphoneButton.addEventListener('click', toggleSpeechRecognition);
    stopButton.addEventListener('click', toggleSpeechRecognition);
} else {
    alert('您的浏览器不支持语音识别 API');
}


//发送消息
const sendButton = document.getElementById('sendButton');

sendButton.addEventListener('click', async () => {
    // 确保 settings 已加载
    if (!isSettingsLoaded) {
        await loadSettings(); // 等待加载完成
        if (!isSettingsLoaded) {
            alert('设置加载失败，请稍后重试！');
            return;
        }
    }

    if (!activeButton) {
        alert('请先选择一个功能按钮！');
        return;
    }

    const userText = userInput.value.trim();

    let Temperature = parseFloat(activeButton.Temperature);
    let topP = parseFloat(activeButton.topP);
    let topK = parseFloat(activeButton.topK);

    if (activeButton.content.includes("代码") || activeButton.content.includes("daima")) {
        Temperature = 0.15;
        topP = 0.3;
        topK = 5;
    }

    if (!userText) {
        alert('请输入内容！');
        userInput.focus();
        return;
    }

    let button_label = activeButton.label;
    let symbol = "'"
    // const fullCommand = symbol + userText + symbol + activeButton.content;
    const fullCommand = `<fullcommand>: +${symbol}${userText}${symbol}${activeButton.content}`;
    (async () => {
        userInput.value = ''; // 立即清空
        await sendMessageToAPI(userText, fullCommand, button_label, Temperature, topP, topK);
    })();

});

// 添加回车发送功能
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
    }
});
//焦点在输入框之外，按下回车键，发送内容
// document.addEventListener('keydown', (event) => {
//     if (event.key === 'Enter' && !event.shiftKey) {
//         event.preventDefault();
//         sendButton.click();
//     }
// });

async function sendMessageToAPI(userinput, message, button_label, Temperature, topP, topK) {
    const userText = userinput.trim();
    updateChat('user', userText)

    // 将用户消息添加到历史记录
    chatHistory.push({
        role: "user",

        parts: [{ text: marked.parse("<strong>" + button_label + ": \n\n" + "</strong>" + userText) }]
    });

    // 添加“思考中”的消息
    const tmpMessage = updateChat('ai', '思考中，请等待...');

    if (!isSettingsLoaded) {
        // 如果 settings 未加载完成，等待 loadSettings 执行
        await loadSettings();
        if (!isSettingsLoaded) {
            updateChat("ai", "⚠️ 设置加载失败，请稍后重试。");
            return;
        }
    }
    let retries = settings.length;
    let validSchluesselFound = false; // 添加标志位

    let generationConfigs = {
        maxOutputTokens: max_token,
        temperature: Temperature,
        topP: topP,
        topK: topK
    };

    while (retries > 0 && !validSchluesselFound) {//循环条件
        let retries_no = settings.length - retries + 1;
        // console.log(`第${retries_no}次尝试: `);
        try {
            currentIndex = Math.floor(Math.random() * settings.length);
            console.log('current key No.: ', currentIndex);
            Schluessel = settings[currentIndex];

            const genAI = new GoogleGenerativeAI(Schluessel);
            let model = genAI.getGenerativeModel({ model: model_name });
            // console.log(chatHistory);
            const chat = model.startChat({//这里没有声明关键字（let 或 const），直接使用了外层的 let chat。
                history: chatHistory,
                generationConfig: generationConfigs,
                safetySettings: safetySettings,
            });

            const result = await chat.sendMessage(message);
            const response = await result.response;
            const aiMessage = response.text();
            tmpMessage.remove();
            updateChat('ai', aiMessage);

            validSchluesselFound = true; // 设置标志位
            return;
        } catch (error) {
            console.error("出现错误: ", error);
            //  更精确的错误处理 (例如检查 HTTP 状态码)
            currentIndex = (currentIndex + 1) % settings.length;
            // genAI = new GoogleGenerativeAI(Schluessel);
            // model = genAI.getGenerativeModel({ model: model_name });
            // chat = model.startChat({
            //     history: chatHistory,
            //     generationConfig: generationConfigs,
            //     safetySettings: safetySettings,
            // });
            retries--;
            await new Promise(resolve => setTimeout(resolve, 2000)); // 增加延迟
            //console.error(error);
        }
    }
    if (!validSchluesselFound) { //  根据标志位判断
        tmpMessage.remove();
        updateChat("ai", "⚠️ 所有 API Key 均不可用，请稍后刷新重试。");
    }
}

// 更新聊天的函数
const chatMessages = document.getElementById("chatMessages");
const chatSection = document.getElementById("chatSection");

function updateChat(role, text) {
    const message = document.createElement("div");
    message.classList.add("message", role);
    // const html = marked.parse(text);

    if (role === 'ai') {
        text = text + "\n\n**本站不保存数据，仅缓存在浏览器中，请及时保存！**";//添加提示信息
        // 解析文本中的德语内容
        let html = marked.parse(text);
        message.innerHTML = html;
        // console.log(html);
        saveChatHistory();
        // addPlayButtons(message);//添加语音播放按钮
        addExportButton(message, text); // 添加导出按钮
    } else {
        let html = marked.parse(text);
        message.innerHTML = html;

        addCopyButton(message, text); // 添加复制按钮
    }

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // saveChatHistory(); // 保存到 localStorage
    return message; // 返回创建的 message 元素
}

// 保存历史
function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function addExportButton(message, text) {
    const exportButton = createButton("导出", "#28a745", exportFile); // 创建导出按钮
    exportButton.addEventListener("click", () => exportFile(text)); // 绑定事件
    message.appendChild(exportButton);// 添加按钮到消息块中
}

function addCopyButton(message, text) {
    const copyButton = createButton("复制", "#007bff", copyText); // 创建复制按钮
    copyButton.addEventListener("click", () => copyText(text)); // 绑定事件
    message.appendChild(copyButton);// 添加按钮到消息块中
}


function createButton(text, backgroundColor, callback) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.marginLeft = "10px";
    button.style.padding = "5px 10px";
    button.style.fontSize = "12px";
    button.style.cursor = "pointer";
    button.style.backgroundColor = backgroundColor;
    button.style.color = "white";
    button.style.border = "none";
    button.style.borderRadius = "5px";
    return button;
}

async function exportFile(text) {
    const defaultName = `AI_Response_${Date.now()}.txt`;// 默认文件名
    if (window.showSaveFilePicker) {
        try {
            // 配置文件选择对话框
            const options = {
                suggestedName: defaultName,
                types: [{ description: "Text Files", accept: { "text/plain": [".txt"] } }],
            };
            // 调用文件选择器
            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            // 写入内容到文件并关闭
            await writable.write(text);
            await writable.close();
            console.log("文件已成功保存！");
        } catch (error) {
            console.error("用户取消或保存失败：", error);
        }
    } else {
        // 浏览器不支持 showSaveFilePicker，使用 prompt 获取文件名
        const userFileName = prompt("请输入导出文件名（无需扩展名）", defaultName.replace(".txt", ""));
        const fileName = userFileName ? `${userFileName}.txt` : defaultName;
        // 调用 Blob 下载方式
        exportToBlob(fileName, text);
    }
}

function exportToBlob(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    // 模拟点击下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log("文件已通过 Blob 保存！");
}

function copyText(text) {
    navigator.clipboard.writeText(text)// 使用navigator.clipboard API复制文本
        .then(() => {
            console.log("文本已复制到剪贴板");
            userInput.value = text; //  点击按钮后文本自动填充到输入框
        })
        .catch(err => {
            console.error("复制到剪贴板失败: ", err);
            //alert("复制到剪贴板失败！");
        });
}


function addPlayButtons(message) {
    const germanSentences = message.querySelectorAll('p, li');
    germanSentences.forEach(element => {
        const text = element.textContent.trim(); // trim() 去除多余空格
        if (text.match(/[äöüßÄÖÜ]|[a-zA-Z]/)) { // 简单判断是否包含德语字符
            const playButton = document.createElement('button');
            playButton.className = 'play-button';
            playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            let utterance = null;

            playButton.addEventListener('click', () => {
                if (speechSynthesis.speaking && !speechSynthesis.paused) {
                    speechSynthesis.cancel();
                    playButton.classList.remove('stop');
                    playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                } else {
                    utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'de-DE';
                    utterance.onend = () => {
                        playButton.classList.remove('stop');
                        playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };
                    speechSynthesis.speak(utterance);
                    playButton.classList.add('stop');
                    playButton.innerHTML = '<i class="fas fa-stop"></i>';
                }
            });
            //element.appendChild(playButton);暂时不添加语音播放按钮
        }
    });
}


// Scroll to Top button functionality (chatMessages)
document.getElementById("scrollTopButton").addEventListener("click", () => {
    chatMessages.scrollTo({ top: 0, behavior: "smooth" });
});

// Scroll to Bottom button functionality (chatMessages)
document.getElementById("scrollBottomButton").addEventListener("click", () => {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
});