import { GoogleGenAI, GenerateContentResponse, Chat, FunctionDeclaration, Type, Part } from '@google/genai';
import { appState, saveState } from '../../state/store.js';
import { showToast } from '../../components/Toast.js';
import { IncomeRecord, ExpenseRecord, RecurrenceRule, Salary } from '../../types/index.js';

type NavigateFunction = (view: string) => void;

let chatContainer: HTMLElement;
let messageInput: HTMLTextAreaElement;
let sendButton: HTMLButtonElement;
let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;
let isLoading = false;
let selectedImage: { dataUrl: string; base64: string; mimeType: string; } | null = null;
let imagePreviewContainer: HTMLElement;
let fileInput: HTMLInputElement;

// --- Function Declarations for Gemini ---
const saveIncomeRecordTool: FunctionDeclaration = {
    name: 'saveIncomeRecord',
    description: "Guarda un nuevo registro de ingreso. Utilízalo cuando el usuario quiera registrar una nueva fuente de ingresos.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "Un nombre corto y descriptivo para el ingreso, ej: 'Proyecto Freelance'."
            },
            amount: {
                type: Type.NUMBER,
                description: "El valor numérico del ingreso."
            },
            source: {
                type: Type.STRING,
                description: "De dónde proviene el ingreso, ej: 'Cliente X'."
            },
            date: {
                type: Type.STRING,
                description: "La fecha en que se recibió el ingreso en formato AAAA-MM-DD. Si no se proporciona, usa la fecha de hoy."
            },
            description: {
                type: Type.STRING,
                description: "Una descripción detallada del ingreso. Si el usuario no es claro, pregunta para quién es, de quién proviene y el motivo. Por ejemplo: 'SINPE recibido de Juan por pago de almuerzo'."
            }
        },
        required: ['name', 'amount']
    }
};

const saveExpenseRecordTool: FunctionDeclaration = {
    name: 'saveExpenseRecord',
    description: "Guarda un nuevo registro de gasto. Utilízalo cuando el usuario quiera registrar un nuevo gasto o compra.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "Un nombre corto y descriptivo para el gasto, ej: 'Supermercado'."
            },
            amount: {
                type: Type.NUMBER,
                description: "El valor numérico del gasto."
            },
            category: {
                type: Type.STRING,
                description: "La categoría del gasto, ej: 'Comida', 'Transporte'."
            },
            date: {
                type: Type.STRING,
                description: "La fecha del gasto en formato AAAA-MM-DD. Si no se proporciona, usa la fecha de hoy."
            },
            description: {
                type: Type.STRING,
                description: "Una descripción detallada del gasto. Si el usuario no es claro, pregunta qué se compró, dónde y para quién. Por ejemplo: 'SINPE enviado a María para el regalo de cumpleaños'."
            }
        },
        required: ['name', 'amount']
    }
};

const updateUserProfileTool: FunctionDeclaration = {
    name: 'updateUserProfile',
    description: "Actualiza el nombre y apellido del usuario en el perfil de la aplicación. Úsalo si el usuario pide cambiar su nombre.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            firstName: { type: Type.STRING, description: "El nuevo nombre del usuario." },
            lastName: { type: Type.STRING, description: "El nuevo apellido del usuario." }
        }
    }
};

const addOrUpdateSalaryTool: FunctionDeclaration = {
    name: 'addOrUpdateSalary',
    description: "Agrega un nuevo salario fijo o actualiza uno existente. Los salarios fijos se registran automáticamente como ingresos recurrentes.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "Opcional. El ID del salario a actualizar. Si se omite, se creará un nuevo salario." },
            name: { type: Type.STRING, description: "Nombre del salario, ej: 'Trabajo Principal'." },
            amount: { type: Type.NUMBER, description: "Monto del salario." },
            recurrence: {
                type: Type.OBJECT,
                description: "Define la frecuencia del pago.",
                properties: {
                    type: { type: Type.STRING, description: "El tipo de recurrencia. Valores posibles: 'Diario', 'Semanal', 'Quincenal', 'Mensual'." },
                    dayOfWeek: { type: Type.STRING, description: "Para recurrencia 'Semanal', el día de la semana (ej: 'Lunes')." },
                    daysOfMonth: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Para 'Quincenal' o 'Mensual', un array con los días del mes (ej: [15] o [15, 30])." }
                },
                required: ['type']
            }
        },
        required: ['name', 'amount', 'recurrence']
    }
};

const deleteSalaryTool: FunctionDeclaration = {
    name: 'deleteSalary',
    description: "Elimina un salario fijo del perfil del usuario. Esto también eliminará el registro de ingreso recurrente asociado. Pide confirmación al usuario antes de usar esta herramienta.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            salaryId: { type: Type.STRING, description: "El ID del salario que se debe eliminar." }
        },
        required: ['salaryId']
    }
};

// --- Local Functions to be Called by Gemini ---
const _saveIncomeRecord = (args: any, onSave: () => void): { result: string } => {
    const newRecord: IncomeRecord = {
        id: `inc-${Date.now()}`,
        type: 'Único',
        name: args.name,
        source: args.source || 'Gemini',
        amount: args.amount,
        date: args.date || new Date().toISOString().split('T')[0],
        description: args.description || 'Registrado por Gemini',
    };
    appState.incomeRecords.push(newRecord);
    saveState(appState);
    onSave();
    showToast(`Ingreso "${args.name}" guardado.`);
    return { result: "Success" };
};

const _saveExpenseRecord = (args: any, onSave: () => void): { result: string } => {
    const newRecord: ExpenseRecord = {
        id: `exp-${Date.now()}`,
        type: 'Único',
        name: args.name,
        category: args.category || 'General',
        amount: args.amount,
        date: args.date || new Date().toISOString().split('T')[0],
        description: args.description || 'Registrado por Gemini',
    };
    appState.expenseRecords.push(newRecord);
    saveState(appState);
    onSave();
    showToast(`Gasto "${args.name}" guardado.`);
    return { result: "Success" };
};

const _updateUserProfile = (args: { firstName?: string; lastName?: string }, onSave: () => void): { result: string } => {
    if (args.firstName) appState.userProfile.firstName = args.firstName;
    if (args.lastName) appState.userProfile.lastName = args.lastName;
    saveState(appState);
    onSave();
    showToast("Perfil de usuario actualizado.");
    return { result: "Success" };
};

const _addOrUpdateSalary = (args: any, onSave: () => void): { result: string } => {
    const isEditMode = !!args.id;
    const newSalary: Salary = {
        id: args.id || `sal-${Date.now()}`,
        name: args.name,
        amount: args.amount,
        recurrence: args.recurrence,
    };

    if (!appState.userProfile.salaries) {
        appState.userProfile.salaries = [];
    }

    if (isEditMode) {
        const index = appState.userProfile.salaries.findIndex(s => s.id === args.id);
        if (index > -1) appState.userProfile.salaries[index] = newSalary;
    } else {
        appState.userProfile.salaries.push(newSalary);
    }
    
    const correspondingIncome = appState.incomeRecords.find(rec => rec.salaryId === newSalary.id);
    if (correspondingIncome) {
        correspondingIncome.name = newSalary.name;
        correspondingIncome.amount = newSalary.amount;
        correspondingIncome.recurrence = newSalary.recurrence;
    } else {
        const newIncomeRecord: IncomeRecord = {
            id: `inc-sal-${newSalary.id}`,
            type: 'Recurrente',
            name: newSalary.name,
            source: 'Salario Fijo',
            amount: newSalary.amount,
            description: `Ingreso del salario "${newSalary.name}" gestionado desde Ajustes.`,
            recurrence: newSalary.recurrence,
            salaryId: newSalary.id,
        };
        appState.incomeRecords.push(newIncomeRecord);
    }

    saveState(appState);
    onSave();
    showToast(isEditMode ? 'Salario actualizado.' : 'Nuevo salario agregado.');
    return { result: "Success" };
};

const _deleteSalary = (args: { salaryId: string }, onSave: () => void): { result: string } => {
    appState.userProfile.salaries = (appState.userProfile.salaries || []).filter(s => s.id !== args.salaryId);
    appState.incomeRecords = appState.incomeRecords.filter(rec => rec.salaryId !== args.salaryId);
    saveState(appState);
    onSave();
    showToast("Salario eliminado.");
    return { result: "Success" };
};

const initializeGemini = () => {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
        try {
            ai = new GoogleGenAI({ apiKey });
            
            const userProfile = appState.userProfile;
            const userName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || 'el propietario de la app';

            const financialContext = `
                Actúa como 'Peso', un asistente financiero experto, amigable y meticuloso para el usuario '${userName}'. Tu objetivo es ayudar al usuario a gestionar sus finanzas personales y a configurar la aplicación con la mayor precisión posible. Responde siempre en español.

                **Capacidades Principales:**
                1.  **Registro de Transacciones:** Guarda ingresos y gastos.
                2.  **Análisis de Datos:** Ofrece consejos y resúmenes basados en los datos financieros.
                3.  **Configuración de la App:** Modifica ajustes como el perfil de usuario y los salarios fijos.

                **Directivas Clave:**
                1.  **Análisis de Imágenes (¡MUY IMPORTANTE!):** Si el usuario sube una imagen de un recibo o una transferencia (como un SINPE), analízala CUIDADOSAMENTE.
                    *   Busca el nombre del usuario: **'${userName}'**.
                    *   Si **'${userName}'** es quien **ENVÍA** el dinero, es un **GASTO**.
                    *   Si **'${userName}'** es quien **RECIBE** el dinero, es un **INGRESO**.
                    *   Extrae el monto, la fecha y los nombres de otras personas directamente de la imagen.
                    *   **NUNCA preguntes por información que ya es visible en la imagen (como el monto).**

                2.  **Claridad ante todo:** Si una solicitud del usuario (de texto o de imagen) es ambigua sobre el MOTIVO, DEBES hacer preguntas para aclarar. Nunca asumas el motivo de una transacción. Por ejemplo, si ves un SINPE, pregunta: "¿Cuál fue el motivo de esta transferencia?". Esto es crucial para registrar una descripción útil.

                3.  **Descripciones Detalladas:** Al usar las herramientas para guardar registros, asegúrate de que el campo 'description' sea lo más detallado posible. No te conformes con descripciones cortas. La descripción no tiene límite de tamaño.
                
                4.  **Uso de Herramientas de Configuración:** El usuario puede pedirte que cambies su nombre, agregues un salario, etc. Utiliza las herramientas de configuración para cumplir estas peticiones. Ej: "Actualiza mi nombre a Juan" o "Agrega mi salario de 50000 cada día 15".

                **ESTADO ACTUAL DE LA APLICACIÓN (en formato JSON):**
                - Perfil de Usuario: ${JSON.stringify(appState.userProfile)}
                - Ingresos: ${JSON.stringify(appState.incomeRecords)}
                - Gastos: ${JSON.stringify(appState.expenseRecords)}
                - Ahorros: ${JSON.stringify(appState.savingRecords)}
            `;
            chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: financialContext,
                    tools: [{ functionDeclarations: [
                        saveIncomeRecordTool, 
                        saveExpenseRecordTool,
                        updateUserProfileTool,
                        addOrUpdateSalaryTool,
                        deleteSalaryTool
                    ] }],
                },
            });

        } catch (error) {
            console.error("Failed to initialize Gemini AI:", error);
            showToast("Error al inicializar Gemini. Revisa la configuración.");
            ai = null;
            chat = null;
        }
    } else {
        ai = null;
        chat = null;
    }
};

const addMessageToChat = (text: string, sender: 'user' | 'gemini' | 'loading', imageUrl?: string) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);

    if (sender === 'loading') {
        messageElement.innerHTML = `<div class="loading-dots"><div></div><div></div><div></div></div>`;
    } else {
        if (imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.alt = 'User uploaded image';
            imgElement.className = 'chat-image';
            messageElement.appendChild(imgElement);
        }
        if (text) {
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedText = formattedText.replace(/\n/g, '<br>');
            const textElement = document.createElement('div');
            textElement.innerHTML = formattedText;
            messageElement.appendChild(textElement);
        }
    }

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const handleSendMessage = async (onSave: () => void, promptText?: string) => {
    if (isLoading) return;
    const text = promptText || messageInput.value.trim();
    
    if (!text && !selectedImage) return;
    
    if (!ai || !chat) {
        showToast('La API de Gemini no está configurada correctamente.');
        return;
    }

    isLoading = true;
    addMessageToChat(text, 'user', selectedImage?.dataUrl);
    
    const imageToSend = selectedImage;
    messageInput.value = '';
    messageInput.style.height = 'auto';
    messageInput.disabled = true;
    sendButton.disabled = true;
    if (selectedImage) {
        selectedImage = null;
        imagePreviewContainer.style.display = 'none';
        fileInput.value = '';
    }

    addMessageToChat('', 'loading');

    try {
        const parts: Part[] = [];
        if (imageToSend) {
            parts.push({
                inlineData: {
                    data: imageToSend.base64,
                    mimeType: imageToSend.mimeType,
                }
            });
        }
        if (text) {
            parts.push({ text });
        }
        
        const response: GenerateContentResponse = await chat.sendMessage({ message: parts });

        const loadingMessage = chatContainer.querySelector('.loading-message');
        if (loadingMessage) loadingMessage.remove();

        if (response.functionCalls && response.functionCalls.length > 0) {
            const functionResponseParts: Part[] = [];

            for (const fc of response.functionCalls) {
                let result: { result: string };
                if (fc.name === 'saveIncomeRecord') {
                    result = _saveIncomeRecord(fc.args, onSave);
                } else if (fc.name === 'saveExpenseRecord') {
                    result = _saveExpenseRecord(fc.args, onSave);
                } else if (fc.name === 'updateUserProfile') {
                    result = _updateUserProfile(fc.args, onSave);
                } else if (fc.name === 'addOrUpdateSalary') {
                    result = _addOrUpdateSalary(fc.args, onSave);
                } else if (fc.name === 'deleteSalary') {
                    // FIX: Cast fc.args to the expected type to resolve the type error.
                    result = _deleteSalary(fc.args as { salaryId: string }, onSave);
                } else {
                    continue;
                }

                functionResponseParts.push({
                    functionResponse: {
                        name: fc.name,
                        response: { result: result.result }
                    }
                });
            }

            const finalResponse = await chat.sendMessage({ message: functionResponseParts });
            addMessageToChat(finalResponse.text, 'gemini');

        } else {
            addMessageToChat(response.text, 'gemini');
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        const loadingMessage = chatContainer.querySelector('.loading-message');
        if (loadingMessage) loadingMessage.remove();
        addMessageToChat('Hubo un error al contactar a Gemini. Por favor, intenta de nuevo.', 'gemini');
    } finally {
        isLoading = false;
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
};

export const renderGeminiView = (container: HTMLElement, navigate: NavigateFunction, onSave: () => void) => {
    container.innerHTML = '';
    initializeGemini();

    const header = document.createElement('div');
    header.className = 'income-page-header gemini-header';

    const backButton = document.createElement('button');
    backButton.className = 'btn btn-back';
    backButton.innerHTML = '&larr; Volver';
    backButton.onclick = () => navigate('dashboard');

    const title = document.createElement('h2');
    title.className = 'gemini-header-title';
    title.textContent = 'Asistente Gemini';
    
    header.appendChild(backButton);
    header.appendChild(title);
    container.appendChild(header);

    const geminiWrapper = document.createElement('div');
    geminiWrapper.className = 'gemini-wrapper';

    chatContainer = document.createElement('div');
    chatContainer.className = 'gemini-chat-container';
    geminiWrapper.appendChild(chatContainer);

    imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.className = 'gemini-image-preview-container';
    imagePreviewContainer.style.display = 'none';
    geminiWrapper.appendChild(imagePreviewContainer);

    const inputArea = document.createElement('div');
    inputArea.className = 'gemini-input-area';

    const attachButton = document.createElement('button');
    attachButton.className = 'gemini-attach-btn';
    attachButton.innerHTML = '📎';
    attachButton.setAttribute('aria-label', 'Adjuntar imagen');
    
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    attachButton.onclick = () => fileInput.click();

    fileInput.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
            const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);

            selectedImage = { dataUrl, base64, mimeType };

            imagePreviewContainer.innerHTML = '';
            const previewImg = document.createElement('img');
            previewImg.src = dataUrl;
            previewImg.alt = 'Image preview';
            previewImg.className = 'gemini-preview-image';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'gemini-remove-image-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.setAttribute('aria-label', 'Quitar imagen');
            removeBtn.onclick = () => {
                selectedImage = null;
                imagePreviewContainer.style.display = 'none';
                target.value = '';
            };

            imagePreviewContainer.appendChild(previewImg);
            imagePreviewContainer.appendChild(removeBtn);
            imagePreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    };

    messageInput = document.createElement('textarea');
    messageInput.className = 'gemini-input';
    messageInput.placeholder = 'Escribe tu consulta financiera...';
    messageInput.rows = 1;
    messageInput.oninput = () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = `${messageInput.scrollHeight}px`;
    };
    messageInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(onSave);
        }
    };

    sendButton = document.createElement('button');
    sendButton.className = 'gemini-send-btn';
    sendButton.innerHTML = '&#10148;';
    sendButton.setAttribute('aria-label', 'Enviar mensaje');
    sendButton.onclick = () => handleSendMessage(onSave);

    inputArea.appendChild(attachButton);
    inputArea.appendChild(fileInput);
    inputArea.appendChild(messageInput);
    inputArea.appendChild(sendButton);

    geminiWrapper.appendChild(inputArea);
    
    container.appendChild(geminiWrapper);

    if (!ai) {
        addMessageToChat('Hola, soy tu asistente financiero. Parece que la API de Gemini **no está configurada** en el entorno de esta aplicación. No podré responder a tus consultas.', 'gemini');
        messageInput.disabled = true;
        sendButton.disabled = true;
        attachButton.disabled = true;
    } else {
        addMessageToChat('Hola, soy tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedes pedirme que guarde ingresos, gastos o incluso que configure tu perfil.', 'gemini');
    }
};