import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Code, Copy, Zap, Loader2, BookOpen, Repeat, Lightbulb, MessageSquare, CodeXml, CornerDownLeft, Send } from 'lucide-react';

// --- CONFIGURAÇÕES DA API GEMINI ---
// Lê a URL do backend: http://localhost:3000/api
const PROXY_URL = import.meta.env.VITE_PUBLIC_API_KEY;

// System Prompts (Personas da IA)
const explainerSystemPrompt = "Atue como um tutor de programação especialista e amigável...";
const refactorSystemPrompt = "Você é um engenheiro de software especialista...";
const generatorSystemPrompt = "Você é um gerador de scripts...";
const chatbotSystemPrompt = "Você é o GBit-Gemini-AI...";

/**
 * Envia a requisição para o SEU BACKEND (Proxy) com tratamento de erro e backoff exponencial.
 */
const fetchGemini = async (contents, systemInstruction, maxRetries = 5) => {
    const requestBody = {
        contents: contents,
        systemInstruction: systemInstruction,
    };

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    };
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(PROXY_URL, options);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro do Backend (HTTP ${response.status}): ${errorText.substring(0, 100)}`);
            }

            return await response.json();
        } catch (e) {
            if (i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error("Falha na comunicação com a API após várias tentativas. (Verifique o servidor 3000)");
            }
        }
    }
};


// --- COMPONENTE AUXILIAR: Barra de Navegação Superior (Static) ---
const NavItem = ({ name }) => (
    <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
        {name}
    </button>
);

// Função auxiliar para renderizar markdown (simples)
const renderSimpleMarkdown = (text) => {
    // Tratamento básico para evitar que undefined/null quebrem
    if (!text) return null;

    return (
        <div 
            className="text-gray-300 whitespace-pre-wrap font-sans text-sm"
            dangerouslySetInnerHTML={{ 
                __html: text
                    // Bloco de código
                    .replace(/```[a-zA-Z]*\n([\s\S]*?)\n```/g, '<pre class="bg-gray-800 p-3 my-2 rounded text-green-300 overflow-x-auto border border-gray-700"><code>$1</code></pre>')
                    // Títulos H2
                    .replace(/^##\s(.*?)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-purple-400">$1</h2>')
                    // Listas
                    .replace(/^-?\s(.*?)$/gm, '<li class="ml-5 list-disc">$1</li>')
                    // Parágrafos (Substitui múltiplas quebras por parágrafos HTML)
                    .replace(/\n\n/g, '<p class="mb-2"></p>')
            }}
        />
    );
};


// --- TOOL 1: Code Explainer (Explica o Código) ---

const initialExplainerCode = `
// Exemplo: Função assíncrona
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(\`HTTP error! Status: \${response.status}\`);
        }
        return response.json();
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}
`;

const CodeExplainerTool = () => {
    const [code, setCode] = useState(initialExplainerCode);
    const [explanation, setExplanation] = useState("Cole seu código JavaScript, Python, ou qualquer outro, e clique em 'Explicar' para uma análise detalhada por IA.");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const explainCode = async () => {
        if (code.trim() === '') {
            setError("Por favor, cole algum código para ser analisado.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setExplanation("Analisando código... por favor, aguarde.");

        try {
            const contents = [{ parts: [{ text: code }] }];
            const result = await fetchGemini(contents, explainerSystemPrompt);
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (text) {
                setExplanation(text);
            } else {
                setExplanation("Não foi possível obter uma explicação clara. Tente um código diferente.");
            }
        } catch (e) {
            console.error(e);
            setError("Erro ao processar a requisição: " + e.message);
            setExplanation("Ocorreu um erro. Verifique sua conexão ou o console para detalhes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-4">
                <textarea
                    className="w-full h-40 p-3 bg-gray-900 text-green-300 font-mono text-sm rounded-lg border border-gray-700 focus:ring-purple-500 focus:border-purple-500 resize-none custom-scrollbar"
                    placeholder="Cole seu código aqui..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex-shrink-0 mb-6">
                <button
                    onClick={explainCode}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analisando...</span>
                        </>
                    ) : (
                        <>
                            <Lightbulb className="w-5 h-5" />
                            <span>Explicar Código!</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar border border-gray-700">
                <div className="text-sm">
                    {isLoading && !error ? (
                        <p className="text-gray-400 text-center py-8">A IA está gerando a explicação. Isso pode levar alguns segundos...</p>
                    ) : (
                        renderSimpleMarkdown(explanation)
                    )}
                </div>
            </div>
        </div>
    );
};


// --- TOOL 2: Code Refactor (Refatora/Converte o Código) ---

const initialRefactorCode = `
// Função em JavaScript
function calculateSum(arr) {
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
        total += arr[i];
    }
    return total;
}
`;
const initialInstruction = "Traduzir o código acima para Python 3, usando a função sum() e list comprehensions.";

const CodeRefactorTool = () => {
    const [code, setCode] = useState(initialRefactorCode);
    const [instruction, setInstruction] = useState(initialInstruction);
    const [resultCode, setResultCode] = useState("O código refatorado/convertido aparecerá aqui.");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refactorCode = async () => {
        if (code.trim() === '' || instruction.trim() === '') {
            setError("Por favor, preencha tanto o código quanto a instrução de modificação.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultCode("Processando a refatoração/conversão... por favor, aguarde.");

        const combinedPrompt = `CÓDIGO ORIGINAL:\n\n${code}\n\nINSTRUÇÃO DE MODIFICAÇÃO:\n\n${instruction}`;
        
        try {
            const contents = [{ parts: [{ text: combinedPrompt }] }];
            const result = await fetchGemini(contents, refactorSystemPrompt);

            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar resposta.";
            
            // Tenta extrair o bloco de código (o modelo deve retornar apenas o bloco)
            const codeBlockMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
            const cleanedCode = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

            setResultCode(cleanedCode);
        } catch (e) {
            console.error(e);
            setError("Erro ao processar a requisição: " + e.message);
            setResultCode("Ocorreu um erro. Verifique sua conexão ou o console para detalhes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-4">
                <label className="text-sm font-semibold text-gray-300 block mb-1">Instrução de Modificação:</label>
                <textarea
                    className="w-full h-16 p-2 bg-gray-900 text-yellow-300 font-sans text-sm rounded-lg border border-gray-700 focus:ring-green-500 focus:border-green-500 resize-none custom-scrollbar"
                    placeholder="Ex: 'Traduzir para Python 3, usando loops for, e incluir docstrings'"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                />
            </div>

            <div className="flex-shrink-0 mb-4">
                <label className="text-sm font-semibold text-gray-300 block mb-1">Código Original:</label>
                <textarea
                    className="w-full h-24 p-3 bg-gray-900 text-green-300 font-mono text-sm rounded-lg border border-gray-700 focus:ring-green-500 focus:border-green-500 resize-none custom-scrollbar"
                    placeholder="Cole seu código aqui..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex-shrink-0 mb-6">
                <button
                    onClick={refactorCode}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Refatorando...</span>
                        </>
                    ) : (
                        <>
                            <Repeat className="w-5 h-5" />
                            <span>Refatorar/Converter Código</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar border border-gray-700">
                <div className="text-sm">
                    {isLoading && !error ? (
                        <p className="text-gray-400 text-center py-4">Gerando novo código...</p>
                    ) : (
                        <pre className="text-green-300 font-mono whitespace-pre-wrap">
                            {resultCode}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TOOL 3: Code Generator (Gera Scripts Completos) ---

const CodeGeneratorTool = () => {
    const [prompt, setPrompt] = useState("Criar um script em Python para conectar na API 'Binance' (mock) e executar uma ordem de compra a mercado para BTC/USDT.");
    const [resultCode, setResultCode] = useState("O script completo, pronto para usar, aparecerá aqui.");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateCode = async () => {
        if (prompt.trim() === '') {
            setError("Por favor, insira um prompt para gerar código.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultCode("Gerando script... por favor, aguarde.");

        try {
            const contents = [{ parts: [{ text: prompt }] }];
            const result = await fetchGemini(contents, generatorSystemPrompt);

            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar resposta.";

            // O modelo deve retornar APENAS o bloco de código
            const codeBlockMatch = text.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
            const cleanedCode = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
            
            setResultCode(cleanedCode);

        } catch (e) {
            console.error(e);
            setError("Erro ao processar a requisição: " + e.message);
            setResultCode("Ocorreu um erro. Verifique sua conexão ou o console para detalhes.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 mb-4">
                <label className="text-sm font-semibold text-gray-300 block mb-1">Prompt para Geração:</label>
                <textarea
                    className="w-full h-24 p-2 bg-gray-900 text-orange-300 font-sans text-sm rounded-lg border border-gray-700 focus:ring-orange-500 focus:border-orange-500 resize-none custom-scrollbar"
                    placeholder="Ex: 'Criar um script de trade API...'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="flex-shrink-0 mb-6">
                <button
                    onClick={generateCode}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Gerando...</span>
                        </>
                    ) : (
                        <>
                            <CodeXml className="w-5 h-5" />
                            <span>Gerar Script Completo</span>
                        </>
                    )}
                </button>
            </div>

            <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar border border-gray-700">
                <div className="text-sm">
                    {isLoading && !error ? (
                        <p className="text-gray-400 text-center py-4">Preparando o código...</p>
                    ) : (
                        <pre className="text-orange-300 font-mono whitespace-pre-wrap">
                            {resultCode}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TOOL 4: Universal Chatbot (Chat GBit-Gemini-AI) ---

const ChatMessage = ({ message }) => (
    <div className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] p-3 rounded-xl shadow-lg ${
            message.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-700 text-gray-200 rounded-tl-none border border-gray-600'
        }`}>
            {message.role === 'ai' ? renderSimpleMarkdown(message.text) : <p>{message.text}</p>}
        </div>
    </div>
);

const UniversalChatbotTool = () => {
    const [chatHistory, setChatHistory] = useState([{ role: 'ai', text: "Olá! Eu sou o GBit-Gemini-AI. Me pergunte qualquer coisa, ou peça para criar um conteúdo ou código!" }]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (currentMessage.trim() === '' || isLoading) return;

        const userMessage = currentMessage.trim();
        setCurrentMessage('');
        setIsLoading(true);
        setError(null);

        const newHistory = [...chatHistory, { role: 'user', text: userMessage }];
        setChatHistory(newHistory);

        try {
            const apiContents = newHistory.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));
            const result = await fetchGemini(apiContents, chatbotSystemPrompt);
           const aiResponse = result?.text || "Desculpe, não consegui gerar uma resposta.";

            
            setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }]);

        } catch (e) {
            console.error(e);
            setError("Erro ao processar a mensagem: " + e.message);
            setChatHistory(prev => [...prev, { role: 'ai', text: `[ERRO] Falha na comunicação: ${e.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto custom-scrollbar border border-gray-700 mb-4 h-[400px]">
                {chatHistory.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-gray-700 text-gray-200 p-3 rounded-xl shadow-lg rounded-tl-none border border-gray-600 animate-pulse">
                            <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-yellow-400" />
                            <span>Digitando...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            
            <form onSubmit={sendMessage} className="flex flex-shrink-0 space-x-3">
                <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Pergunte ou peça para criar algo..."
                    disabled={isLoading}
                    className="flex-grow p-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-70"
                />
                <button
                    type="submit"
                    disabled={isLoading || currentMessage.trim() === ''}
                    className="flex items-center justify-center p-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-900/50"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL: App (Com Seletor de Ferramentas) ---

export default function App() {
    const [activeTool, setActiveTool] = useState('explainer'); // 'explainer', 'refactor', 'generator', 'chatbot'

    const renderActiveTool = () => {
        switch (activeTool) {
            case 'explainer':
                return <CodeExplainerTool />;
            case 'refactor':
                return <CodeRefactorTool />;
            case 'generator':
                return <CodeGeneratorTool />;
            case 'chatbot':
                return <UniversalChatbotTool />;
            default:
                return <CodeExplainerTool />;
        }
    };
    
    const toolInfo = {
        'explainer': { title: 'Code Explainer (Tutor IA)', icon: Lightbulb, color: 'purple', description: 'Explica detalhadamente qualquer trecho de código.' },
        'refactor': { title: 'Code Refactor (Conversor IA)', icon: Repeat, color: 'green', description: 'Converte ou refatora código de forma estrita.' },
        'generator': { title: 'Script Generator (API/Script)', icon: CodeXml, color: 'orange', description: 'Gera scripts completos e funcionais (APIs, trade, etc.).' },
        'chatbot': { title: 'Universal Chatbot (GBit-Gemini)', icon: MessageSquare, color: 'yellow', description: 'Assiste com perguntas gerais, ideias e conteúdo criativo.' },
    };

    const { title, icon: Icon, color } = toolInfo[activeTool];

    // --- UTILS PARA GARANTIR CLASSES ESTÁTICAS DO TAILWIND ---
    
    const toolColorMap = {
        'purple': { text: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-700', hoverBg: 'hover:bg-purple-600' },
        'green': { text: 'text-green-400', border: 'border-green-500', bg: 'bg-green-700', hoverBg: 'hover:bg-green-600' },
        'orange': { text: 'text-orange-400', border: 'border-orange-500', bg: 'bg-orange-700', hoverBg: 'hover:bg-orange-600' },
        'yellow': { text: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-700', hoverBg: 'hover:bg-yellow-600' },
    };

    /** Retorna as classes para o cartão de ferramenta (borda, texto, botão) */
    const getCardClasses = (colorKey) => {
        const classes = toolColorMap[colorKey] || {};
        return {
            cardBorder: `border-l-4 ${classes.border || 'border-gray-500'}`,
            titleText: classes.text || 'text-white',
            buttonHover: classes.hoverBg || 'hover:bg-gray-600'
        };
    };

    /** Retorna as classes para o botão/tab do seletor de ferramentas */
    const getTabClasses = (key, isActive) => {
        const baseClasses = "flex items-center justify-center space-x-1 px-2 py-2 text-xs sm:text-sm font-semibold rounded-lg transition duration-200 border-2 border-transparent";
        const classes = toolColorMap[toolInfo[key].color] || {};

        if (isActive) {
            return `${baseClasses} ${classes.bg} text-white shadow-md ${classes.border}`;
        } else {
            return `${baseClasses} bg-gray-700 text-gray-300 ${classes.hoverBg} hover:text-white`;
        }
    };
    // --- FIM DOS UTILS ---

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-sans">
            
            {/* Navbar Superior (Imitação do GBit-Hub) */}
            <header className="flex justify-between items-center py-4 px-6 bg-gray-900 shadow-lg sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <Code className="text-purple-500 h-6 w-6" />
                    <h1 className="text-xl font-bold">GBit-Studio PRO</h1>
                </div>
                <nav className="hidden md:flex space-x-6">
                    <NavItem name="Studio" />
                    <NavItem name="Projetos" />
                    <NavItem name="Docs" />
                    <NavItem name="Comunidade" />
                </nav>
                <div className="flex space-x-3 items-center">
                    <div className="relative">
                        <div className="w-3 h-3 bg-red-500 rounded-full absolute top-0 right-0 border-2 border-gray-900"></div>
                        <BookOpen className="text-gray-400 hover:text-white cursor-pointer" />
                    </div>
                    <img
                        className="h-8 w-8 rounded-full"
                        src="https://placehold.co/32x32/1f2937/ffffff?text=U"
                        alt="User Avatar"
                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/32x32/1f2937/ffffff?text=U"; }}
                    />
                </div>
            </header>

            {/* Container Principal de Conteúdo */}
            <main className="max-w-7xl mx-auto mt-8">
                <h2 className="text-3xl font-extrabold mb-8 text-white">
                    <Zap className="inline-block h-8 w-8 text-yellow-400 mr-2" />
                    GBit AI Code Studio
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Coluna Esquerda: Instruções e Ações */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-4">Seu Fluxo de Trabalho AI</h3>
                        <p className="text-gray-400 text-lg">
                            O **GBit AI Code Studio PRO** agora oferece 4 ferramentas de IA para cada etapa
                            do seu desenvolvimento, desde a criação de scripts completos até o chat universal.
                        </p>

                        {/* Cartões de Ferramenta Rápida (Estilização Corrigida) */}
                        <div className="space-y-4">
                            {Object.entries(toolInfo).map(([key, info]) => {
                                const cardClasses = getCardClasses(info.color);
                                return (
                                    <div 
                                        key={key} 
                                        className={`bg-gray-800 p-4 rounded-xl shadow-lg transition-all hover:shadow-xl ${cardClasses.cardBorder}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className={`text-lg font-semibold flex items-center ${cardClasses.titleText}`}>
                                                <info.icon className="w-5 h-5 mr-2" />
                                                {info.title}
                                            </h4>
                                            <button 
                                                onClick={() => setActiveTool(key)} 
                                                className={`text-sm font-medium px-3 py-1 rounded-full bg-gray-700 ${cardClasses.buttonHover} hover:text-white text-gray-300 transition-colors`}
                                            >
                                                Abrir
                                            </button>
                                        </div>
                                        <p className="text-gray-400 text-sm mt-1">{info.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Comandos do Studio */}
                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-xl font-semibold text-purple-400">Novo Projeto</h3>
                                    <button className="text-gray-400 hover:text-purple-400 transition-colors flex items-center space-x-1"
                                        onClick={() => document.execCommand('copy', false, 'npx create-gbit-app "my-projeto"')}
                                    >
                                        <Copy size={16} />
                                        <span className="text-sm">Copiar</span>
                                    </button>
                                </div>
                                <div className="bg-gray-900 p-3 rounded-lg text-sm font-mono text-green-300 overflow-x-auto">
                                    npx create-gbit-app "my-projeto"
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Coluna Direita: Studio de Ferramentas AI */}
                    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl min-h-[600px] flex flex-col h-full border border-purple-700/50">
                        
                        {/* Cabeçalho da Ferramenta Ativa (Estilização Corrigida) */}
                        <h3 className={`text-2xl font-bold text-white flex items-center mb-4 pb-2 border-b border-gray-700`}>
                            <Icon className={`w-6 h-6 mr-2 ${toolColorMap[color]?.text || 'text-white'}`} />
                            {title}
                        </h3>

                        {/* Seletor de Ferramentas (Tabs - Estilização Corrigida) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0 mb-6">
                            {Object.entries(toolInfo).map(([key, info]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTool(key)}
                                    className={getTabClasses(key, activeTool === key)}
                                >
                                    <info.icon size={16} />
                                    <span className="hidden sm:inline">{key === 'chatbot' ? 'Chatbot' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                    <span className="sm:hidden">{key === 'explainer' ? 'Explicar' : key === 'refactor' ? 'Refatorar' : key === 'generator' ? 'Gerar' : 'Chat'}</span>
                                </button>
                            ))}
                        </div>

                        {/* Renderização da Ferramenta Ativa */}
                        <div className="flex-grow min-h-0">
                            {renderActiveTool()}
                        </div>
                        
                    </div>
                    
                </div>
            </main>

            {/* Estilos para a barra de rolagem customizada e ajustes de layout (Classes dinâmicas removidas daqui) */}
            <style jsx global>{`
                /* Estilos do Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #374151; /* gray-700 */
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #5b21b6; /* purple-700 (Cor padrão) */
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #7c3aed; /* purple-500 */
                }
                /* Ajuste para textarea */
                textarea.custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #5b21b6 #374151;
                }
            `}</style>
        </div>
    );
}











