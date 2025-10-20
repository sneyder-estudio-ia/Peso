
import { GoogleGenAI } from 'https://esm.run/@google/genai';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import { appState } from '../../state/store.js';

// This is a simplified navigate function type for this component's needs
type NavigateFunction = (view: string, state?: any) => void;

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// Keep chat history in memory for the session.
const chatHistory: ChatMessage[] = [];

const renderChatHistory = (chatContainer: HTMLElement) => {
    chatContainer.innerHTML = '';
    chatHistory.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', message.role === 'model' ? 'gemini-message' : 'user-message');
        
        // Use marked to render Markdown from the model. Sanitize in a real app.
        if (message.role === 'model') {
             try {
                messageElement.innerHTML = marked.parse(message.text) as string;
             } catch (e) {
                console.error('Error parsing markdown:', e);
                messageElement.textContent = message.text;
             }
        } else {
            // For user messages, just use textContent to prevent XSS.
            messageElement.textContent = message.text;
        }

        chatContainer.appendChild(messageElement);
    });
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const getFinancialSummary = () => {
    const totalIncome = appState.incomeRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalExpense = appState.expenseRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalSavings = appState.savingRecords.reduce((sum, record) => sum + record.amount, 0);

    const summary = {
        incomes: appState.incomeRecords.map(({ name, amount, type, recurrence, date, source }) => ({ name, amount, type, source, recurrence, date })),
        expenses: appState.expenseRecords.map(({ name, amount, category, type, recurrence, date }) => ({ name, amount, category, type, recurrence, date })),
        savings: appState.savingRecords.map(({ name, amount, type, goalAmount }) => ({ name, amount, type, goalAmount })),
        summary: {
            totalIncome,
            totalExpense,
            totalSavings,
            balance: totalIncome - totalExpense,
        },
    };
    return JSON.stringify(summary, null, 2);
};

export const renderGeminiView = (
    container: HTMLElement,
    navigate: NavigateFunction,
    rerenderStats: () => void, // Even if unused, it's in the function signature
) => {
    container.innerHTML = ''; // Clear previous content

    const wrapper = document.createElement('div');
    wrapper.className = 'gemini-wrapper';

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'gemini-header income-page-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => {
        // Clear history when leaving the view to start fresh next time
        chatHistory.length = 0;
        navigate('dashboard');
    };

    const title = document.createElement('h2');
    title.className = 'gemini-header-title';
    title.textContent = 'Asistente Gemini';
    
    header.appendChild(backButton);
    header.appendChild(title);

    // --- Chat Container ---
    const chatContainer = document.createElement('div');
    chatContainer.className = 'gemini-chat-container';

    // --- Input Form ---
    const form = document.createElement('form');
    form.className = 'gemini-input-area';
    
    const input = document.createElement('textarea');
    input.placeholder = 'Pregúntale a Gemini sobre tus finanzas...';
    input.className = 'gemini-input';
    input.rows = 1;
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        // Limit max height to prevent it from growing too large
        const newHeight = Math.min(input.scrollHeight, 120);
        input.style.height = `${newHeight}px`;
    });

    const sendButton = document.createElement('button');
    sendButton.type = 'submit';
    sendButton.className = 'gemini-send-btn';
    sendButton.innerHTML = '<span>&#10148;</span>'; // Send icon
    sendButton.setAttribute('aria-label', 'Enviar mensaje');
    
    form.appendChild(input);
    form.appendChild(sendButton);

    wrapper.appendChild(header);
    wrapper.appendChild(chatContainer);
    wrapper.appendChild(form);
    container.appendChild(wrapper);

    // --- Initial State & Logic ---
    if (chatHistory.length === 0) {
        chatHistory.push({ role: 'model', text: '¡Hola! Soy tu asistente financiero. ¿Cómo puedo ayudarte a analizar tus datos hoy?' });
    }
    renderChatHistory(chatContainer);

    const handleSendMessage = async (e: Event) => {
        e.preventDefault();
        const userInput = input.value.trim();
        if (!userInput) return;

        chatHistory.push({ role: 'user', text: userInput });
        input.value = '';
        input.style.height = 'auto'; // Reset height
        renderChatHistory(chatContainer);

        // Add loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('chat-message', 'loading-message');
        loadingElement.innerHTML = `
            <div class="loading-dots">
                <div></div>
                <div></div>
                <div></div>
            </div>`;
        chatContainer.appendChild(loadingElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        sendButton.disabled = true;
        input.disabled = true;

        try {
            // Per guidelines, API key must come from process.env.API_KEY.
            // Assuming this is injected into the browser environment.
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                throw new Error("La API Key de Gemini no está configurada en el entorno (process.env.API_KEY).");
            }
            
            const ai = new GoogleGenAI({ apiKey });

            const financialContext = getFinancialSummary();
            // We create a concise prompt for the model
            const prompt = `**Contexto Financiero (JSON):**\n${financialContext}\n\n**Pregunta del Usuario:**\n${userInput}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                     systemInstruction: "Eres un asistente financiero experto para una aplicación de finanzas personales llamada 'Peso'. Tu tarea es analizar los datos financieros del usuario, que se proporcionan en formato JSON, y responder a sus preguntas de manera clara y útil. Sé conciso, amigable y utiliza formato Markdown para mejorar la legibilidad de tus respuestas (listas, negritas, etc.). No hagas referencia directa al 'JSON proporcionado' en tu respuesta; actúa como si tuvieras acceso directo a sus datos financieros. Todas tus respuestas deben ser en español.",
                }
            });

            chatHistory.push({ role: 'model', text: response.text });

        } catch (error) {
            console.error('Error calling Gemini API:', error);
            const errorMessage = (error instanceof Error) ? error.message : 'Ocurrió un error desconocido.';
            chatHistory.push({ role: 'model', text: `Lo siento, ocurrió un error al contactar al asistente: ${errorMessage}` });
        } finally {
            // Remove loading indicator and render final history
            loadingElement.remove();
            renderChatHistory(chatContainer);
            sendButton.disabled = false;
            input.disabled = false;
            input.focus();
        }
    };

    form.onsubmit = handleSendMessage;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    });
};