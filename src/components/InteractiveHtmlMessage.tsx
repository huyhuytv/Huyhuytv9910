
import React, { useMemo, forwardRef, useState, useEffect } from 'react';
import type { TavernHelperScript, ChatMessage } from '../types';

interface InteractiveHtmlMessageProps {
  htmlContent: string;
  scripts: TavernHelperScript[];
  originalContent: string;
  initialData?: any | null;
  extensionSettings?: Record<string, any>;
  onLoad?: () => void;
  characterName?: string;
  userPersonaName?: string;
  characterId?: string;
  chatId?: string;
  userAvatarUrl?: string;
  chatHistory?: ChatMessage[]; 
}

const DEFAULT_THEME_CSS = `
:root {
    /* Backgrounds */
    --bg_color: #0f172a;
    --bg_color_light: #1e293b;
    --smart-theme-body: transparent;
    --smart-theme-chat: #1e293b;
    --smart-theme-entry: #334155;
    
    /* Text */
    --text_color: #e2e8f0;
    --text_color_dim: #94a3b8;
    --mes_text_color: #e2e8f0;
    
    /* UI Elements */
    --block-body: #1e293b;
    --block-border: #334155;
    --smart-theme-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --user_mes_color: #e2e8f0;
    --char_mes_color: #e2e8f0;
    
    /* Standard Colors */
    --black: #000000;
    --white: #ffffff;
    --grey: #808080;
}
body {
    background-color: transparent !important;
    color: var(--text_color);
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden; 
    font-size: 14px;
    backdrop-filter: none;
}

/* --- MOCK DOM STRUCTURE STYLES --- */
#sheld {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0; 
    background-color: transparent;
    transition: background 0.5s ease;
    pointer-events: none;
}
#wrapper, #content {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 1; 
}
#main {
    position: relative;
    width: 100%;
    min-height: 100%;
    display: flex;
    flex-direction: column;
}
#chat {
    position: relative;
    width: 100%;
    height: auto;
    padding: 10px;
    box-sizing: border-box;
}
#app {
    width: 100%;
    height: 100%;
}

/* --- ST STANDARD CLASSES STUBS (ENHANCED) --- */
.mes { 
    position: relative; 
    width: 100%;
    margin-bottom: 10px;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.3s ease;
}

.mes_block {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    max-width: 100%;
}

.avatar_container {
    flex-shrink: 0;
    margin-right: 15px;
    width: 50px;
    height: 50px;
}

.avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.mes_content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-width: 0; /* Fix flexbox overflow */
    max-width: 100%;
}

.ch_name {
    font-weight: bold;
    margin-bottom: 4px;
    color: var(--text_color);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.mes_text {
    display: block;
    background-color: rgba(30, 41, 59, 0.7); /* slate-800/70 */
    padding: 12px 16px;
    border-radius: 0 12px 12px 12px;
    color: var(--mes_text_color);
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    overflow-wrap: break-word;
    word-wrap: break-word;
}

/* Specific styling for script-generated elements inside mes_text */
.mes_text img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
}

.mes_text code {
    background-color: rgba(0,0,0,0.3);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
}

/* Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
`;

export const InteractiveHtmlMessage = forwardRef<HTMLIFrameElement, InteractiveHtmlMessageProps>(({ 
    htmlContent, 
    scripts, 
    originalContent, 
    initialData, 
    extensionSettings,
    onLoad,
    characterName = 'Character',
    userPersonaName = 'User',
    characterId = 'stcs_char_id',
    chatId = 'stcs_chat_id',
    userAvatarUrl = '',
    chatHistory = [] 
}, ref) => {
  const [iframeHeight, setIframeHeight] = useState<number | string>('840px');

  useEffect(() => {
    const handleResizeMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'CARD_STUDIO_IFRAME_RESIZE') {
        const height = event.data.height;
        if (typeof height === 'number' && height > 0) {
          setIframeHeight(height + 20); 
        }
      }

      if (event.data.type === 'HANDSHAKE_INIT') {
        const iframeEl = (ref as any)?.current as HTMLIFrameElement;
        if (iframeEl && iframeEl.contentWindow) {
            
            // Transform ChatMessage[] to ST format for compatibility
            const stFormattedHistory = (chatHistory || []).map(msg => ({
                name: msg.role === 'user' ? userPersonaName : (msg.role === 'model' ? characterName : 'System'),
                is_user: msg.role === 'user',
                is_name: true,
                send_date: Date.now(),
                mes: msg.content,
                // V3 often checks swipes/swipes_data
                swipes: [msg.content],
                swipes_data: [{}]
            }));

            const handshakePayload = {
                context: {
                    characterId,
                    chatId,
                    name1: userPersonaName,
                    name2: characterName,
                    groupId: null,
                    isGroup: false,
                    characterCard: { name: characterName, description: "Loaded via CardStudio" }
                },
                chat_history: stFormattedHistory,
                stat_data: initialData?.stat_data || initialData || {},
                world_info: initialData?.world_info || [],
            };
            
            iframeEl.contentWindow.postMessage({
                type: 'HANDSHAKE_ACK',
                payload: handshakePayload
            }, '*');
            
            iframeEl.contentWindow.postMessage({
                type: 'EXTENSION_SETTINGS_LOADED',
                payload: extensionSettings || {}
            }, '*');
        }
      }
    };
    window.addEventListener('message', handleResizeMessage);
    return () => window.removeEventListener('message', handleResizeMessage);
  }, [characterName, userPersonaName, characterId, chatId, initialData, extensionSettings, chatHistory, ref]);

  const finalHtml = useMemo(() => {
    const safeJson = (obj: any) => JSON.stringify(obj).replace(/<\/script>/g, '<\\/script>');
    const safeAvatar = userAvatarUrl || 'https://via.placeholder.com/150?text=User';

    const safeOriginalContent = safeJson(originalContent);
    const safeExtensionSettings = safeJson(extensionSettings || {});
    const safeInitialData = safeJson(initialData || {});
    
    const safeInitialContext = safeJson({
        characterId,
        chatId,
        name1: userPersonaName,
        name2: characterName,
        groupId: null,
        isGroup: false,
        characterCard: { name: characterName, description: "Loaded via CardStudio" }
    });

    const bootstrapScript = `
        window.process = { env: { NODE_ENV: 'production' } };
        window.global = window;
        window.setImmediate = (fn) => setTimeout(fn, 0);

        window.exports = {};
        window.module = { exports: window.exports };
        window.require = (moduleName) => {
            if (moduleName === 'fs' || moduleName === 'path') return {}; 
            if (window[moduleName]) return window[moduleName]; 
            return window.module.exports; 
        };

        const _createPlaceholderSvg = (text, width = 300, height = 100) => {
            const svg = \`
            <svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}" aria-hidden="true">
                <rect width="100%" height="100%" fill="#334155" stroke="#64748b" stroke-width="2"/>
                <text x="50%" y="50%" font-family="monospace" font-size="14" fill="#e2e8f0" text-anchor="middle" dy=".3em">\${text}</text>
            </svg>\`;
            return 'data:image/svg+xml;base64,' + btoa(svg);
        };

        const _silentAudioBase64 = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMMTameqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

        window.is_mobile = false; 
        window.is_colab = false;
        window.power_user = { allow_local_fetch: true }; 
        
        window.humanized_iso_date = (dateStr) => {
            const date = dateStr ? new Date(dateStr) : new Date();
            return date.toLocaleString();
        };

        window.sendMessageToParent = (type, payload) => { 
            window.parent.postMessage({ type, payload }, "*"); 
        };
        window.receiveMessageFromParent = (handler) => { 
            window.addEventListener("message", (e) => handler(e.data)); 
        };

        window.sendMessageAsCharacter = (text) => { 
            window.sendMessageToParent("SEND_CHARACTER_MESSAGE", text);
        };
        window.sendMessageAsUser = (text) => { 
            window.sendMessageToParent("SEND_USER_MESSAGE", text); 
        };
        window.appendMessage = (text) => {
             window.sendMessageToParent("APPEND_MESSAGE", text);
        };

        if (!navigator.clipboard) {
            navigator.clipboard = {
                writeText: (text) => {
                    window.parent.postMessage({ type: 'COPY_TO_CLIPBOARD', payload: text }, '*');
                    return Promise.resolve();
                }
            };
        }

        window.addEventListener('error', function(e) {
            const target = e.target;
            if (!target || !target.tagName) return; 

            if (target.getAttribute('data-st-patched')) return;
            target.setAttribute('data-st-patched', 'true');

            const tagName = target.tagName.toUpperCase();
            
            if (tagName === 'IMG') {
                const src = target.getAttribute('src') || 'image';
                const filename = src.split('/').pop().split('?')[0].substring(0, 20) || 'Image';
                target.src = _createPlaceholderSvg(filename + ' (Missing)', target.width || 100, target.height || 50);
                target.style.objectFit = 'contain'; 
                target.style.backgroundColor = '#1e293b';
            } 
            else if (tagName === 'AUDIO' || tagName === 'VIDEO') {
                target.src = _silentAudioBase64;
                target.load(); 
            }
        }, true); 

        window.onerror = function(message, source, lineno, colno, error) {
            try {
                if (String(message).includes('ResizeObserver')) return false;
                const logEntry = {
                    level: 'script-error',
                    source: 'iframe',
                    message: 'Uncaught Iframe Error: ' + message,
                    timestamp: Date.now(),
                    stack: (error && error.stack) || (source + ':' + lineno + ':' + colno)
                };
                window.parent.postMessage({ type: 'iframe-log', payload: logEntry }, '*');
            } catch (e) { console.error('Failed to log iframe error', e); }
            return false;
        };

        window.onunhandledrejection = function(event) {
            try {
                const reason = event.reason;
                let msg = reason;
                let stack = null;
                if (reason instanceof Error) {
                    msg = reason.message;
                    stack = reason.stack;
                }
                if (String(msg).includes('The play() request was interrupted')) return;

                const logEntry = {
                    level: 'script-error',
                    source: 'iframe',
                    message: 'Unhandled Promise Rejection in Iframe: ' + msg,
                    timestamp: Date.now(),
                    stack: stack
                };
                window.parent.postMessage({ type: 'iframe-log', payload: logEntry }, '*');
            } catch (e) {}
        };

        (function() {
            const originalAddEventListener = document.addEventListener;
            document.addEventListener = function(event, callback) {
                if (event === 'DOMContentLoaded' && (document.readyState === 'complete' || document.readyState === 'interactive')) {
                    setTimeout(callback, 1);
                }
                originalAddEventListener.call(document, event, callback);
            };
            
            const patchJQuery = () => {
                 if (window.jQuery && !window.jQuery.patched) {
                     const oldFn = window.jQuery.fn.ready;
                     window.jQuery.fn.ready = function(fn) {
                         if (document.readyState === 'complete') setTimeout(fn, 1);
                         else originalAddEventListener.call(document, 'DOMContentLoaded', fn);
                         return this;
                     };
                     window.jQuery.patched = true;
                 }
            };
            setInterval(patchJQuery, 500);
        })();

        window._cardStudio = {
            log: (level, message, payload = null) => {
                try {
                    const logEntry = { 
                        level, 
                        message: String(message), 
                        timestamp: Date.now(),
                        stack: (new Error()).stack.split('\\n').slice(2).join('\\n') 
                    };
                    if (payload !== null) {
                        try { 
                            const getCircularReplacer = () => {
                                const seen = new WeakSet();
                                return (key, value) => {
                                    if (typeof value === "object" && value !== null) {
                                        if (seen.has(value)) return "[Circular]";
                                        seen.add(value);
                                    }
                                    return value;
                                };
                            };
                            logEntry.payload = JSON.stringify(payload, getCircularReplacer(), 2); 
                        } catch (e) { 
                            logEntry.payload = '[Serialization Error: ' + e.message + ']'; 
                        }
                    }
                    window.parent.postMessage({ type: 'iframe-log', payload: logEntry }, '*');
                } catch(e) {}
            }
        };
        
        const _createStorageMock = (storageName) => {
            const _store = new Map();
            return {
                getItem: (k) => _store.get(String(k)) || null,
                setItem: (k, v) => {
                    const val = String(v);
                    _store.set(String(k), val);
                    window.sendMessageToParent('STORAGE_SET_ITEM', { type: storageName, key: k, value: val });
                },
                removeItem: (k) => {
                    _store.delete(String(k));
                    window.sendMessageToParent('STORAGE_REMOVE_ITEM', { type: storageName, key: k });
                },
                clear: () => _store.clear(),
                key: (i) => Array.from(_store.keys())[i] || null,
                get length() { return _store.size }
            };
        };
        
        const _extensionSettings = ${safeExtensionSettings};
        
        try {
            Object.defineProperty(window, 'localStorage', { value: _createStorageMock('local') });
            Object.defineProperty(window, 'sessionStorage', { value: _createStorageMock('session') });
        } catch (e) {
            _cardStudio.log('warn', 'Failed to mock storage.');
        }

        window.__st_live_data = ${safeInitialData};
        window.stat_data = window.__st_live_data;
        window.__st_context = ${safeInitialContext};
        window.__st_chat_history = []; 
        window.__st_world_info = []; 
        window.__st_character_store = {}; 
        
        window.user_avatar = "${safeAvatar}"; 
        
        const _st_sim_msg_content = ${safeOriginalContent};
        let _isHandshakeComplete = false;

        const _eventListeners = {};
        
        const _emitEvent = (eventName, ...args) => {
            if (_eventListeners[eventName]) {
                _eventListeners[eventName].forEach(cb => {
                    try { cb(...args); } catch (e) {
                        _cardStudio.log('error', 'Event handler failed for: ' + eventName, { stack: e.stack });
                    }
                });
            }
            try {
                window.dispatchEvent(new CustomEvent(eventName, { detail: args[0] }));
            } catch(e){}
        };

        window.eventOn = (eventName, callback) => {
            if (!_eventListeners[eventName]) _eventListeners[eventName] = [];
            _eventListeners[eventName].push(callback);
            window.addEventListener(eventName, (e) => callback(e.detail));
        };
        window.eventEmit = _emitEvent;
        
        window.tavern_events = {
             MESSAGE_RECEIVED: 'message_received',
             GENERATION_STARTED: 'generation_started',
             GENERATION_STOPPED: 'generation_stopped',
             CHAT_CHANGED: 'chat_changed',
             SETTINGS_UPDATED: 'settings_updated',
             EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded'
        };

        window.setBackground = (url) => {
            const sheld = document.getElementById('sheld');
            if (sheld) {
                if (url && !url.startsWith('http') && !url.startsWith('data:')) return;
                sheld.style.backgroundImage = url ? 'url(' + url + ')' : 'none';
                sheld.style.backgroundSize = 'cover';
                sheld.style.backgroundPosition = 'center';
                window.__st_bg = url;
            }
        };
        
        window.play_audio = (url) => {
            try {
                if (!url) return;
                if (!url.startsWith('http') && !url.startsWith('data:')) return;
                
                const audio = new Audio(url);
                audio.volume = 0.5;
                audio.play().catch(e => _cardStudio.log('warn', 'Audio autoplay blocked: ' + e.message));
            } catch(e) {
                _cardStudio.log('warn', 'Audio error: ' + e.message);
            }
        };

        const _phantomInput = {
            _value: '',
            get value() { return this._value; },
            set value(v) {
                this._value = v;
                window.parent.postMessage({ type: 'SET_INPUT_VALUE', payload: v }, '*');
            },
            focus: () => {},
            style: {},
            classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} },
            addEventListener: () => {},
            removeEventListener: () => {}
        };

        window.__st_parent_mock = {
            querySelector: (sel) => {
                if (sel === '#send_textarea' || sel === '#chat_input') return _phantomInput;
                if (sel === '#app' || sel === 'body') return document.body;
                return null;
            },
            getElementById: (id) => {
                 if (id === 'send_textarea' || id === 'chat_input') return _phantomInput;
                 return null;
            },
            body: document.body 
        };

        if (!window.EjsTemplate) {
            window.EjsTemplate = {
                render: async (template, context) => {
                    if (window.ejs && typeof window.ejs.render === 'function') {
                        return window.ejs.render(template, context, { async: true });
                    }
                    return template;
                },
                setFeatures: (features) => {}
            };
        }

        window.executeSlashCommands = (command) => {
             if (typeof command !== 'string') return;
             const cmdTrimmed = command.trim();
             
             if (cmdTrimmed.startsWith('/run ')) {
                 try {
                     new Function(cmdTrimmed.replace('/run ', ''))();
                 } catch(e) {
                     console.warn('/run failed', e);
                 }
                 return;
             }
             if (cmdTrimmed.startsWith('/send ')) {
                 window.sendMessageAsUser(cmdTrimmed.replace('/send ', ''));
                 return;
             }
             if (cmdTrimmed.startsWith('/sys ')) {
                 if(window.toastr) window.toastr.info(cmdTrimmed.replace('/sys ', ''));
                 return;
             }

             if (command.startsWith('/setvar') || command.startsWith('/set ')) {
                const parts = command.match(/(\\w+)\\s*=\\s*(.+)/) || command.split(/\\s+/).slice(1);
                let key, val;
                if (command.includes('=')) {
                    const match = command.match(/^\\/\\w+\\s+([^=]+)=(.*)/);
                    if (match) { key = match[1].trim(); val = match[2].trim(); }
                } else {
                    const splitC = command.trim().split(/\\s+/);
                    if (splitC.length >= 3) {
                        key = splitC[1];
                        val = splitC.slice(2).join(' ');
                    }
                }

                if (key && val !== undefined) {
                     if (val === 'true') val = true;
                     else if (val === 'false') val = false;
                     else if (!isNaN(Number(val))) val = Number(val);
                     
                     const cleanKey = key.replace('stat_data.', '');
                     if (!window.__st_live_data) window.__st_live_data = {};
                     window.__st_live_data[cleanKey] = val;
                     
                     window.eventEmit('mvu-variable-update-ended', { stat_data: window.__st_live_data });
                }
             }
             
             if (command.startsWith('/trigger')) {
                 const triggerName = command.replace('/trigger', '').trim();
                 window.eventEmit('btn_click_' + triggerName);
                 return;
             }
             
             if (command.startsWith('/wait')) {
                 return new Promise(r => setTimeout(r, 500));
             }

             if (command.trim().startsWith('/qr')) {
                  window.parent.postMessage({ type: 'QR_COMMAND', payload: command }, '*');
                  return;
             }
             
             if (command.trim().startsWith('/echo')) {
                 const msg = command.replace('/echo', '').trim();
                 if(window.toastr) window.toastr.info(msg);
                 return;
             }

             window.parent.postMessage({ type: 'interactive-action', payload: command }, '*');
        };
        window.triggerSlash = window.executeSlashCommands;

        window.ST = window.SillyTavern = { 
            version: '1.12.6', 
            status: 'ready',
            config: { main_api: 'openai', visual_novel_mode: false },
            getContext: () => window.__st_context,
            extensionSettings: _extensionSettings,
            user: { name: '${userPersonaName.replace(/'/g, "\\'")}', avatar: "${safeAvatar}" },
            
            chat: {
                history: window.__st_chat_history, 
                send: (msg) => window.sendMessageToParent('SEND_USER_MESSAGE', msg),
                lastMessage: () => window.__st_chat_history[window.__st_chat_history.length - 1] || null,
                getHistory: () => window.__st_chat_history,
                delete: () => {}
            },
            
            modules: {
                quickReply: {},
                expression: {
                    setExpression: (exp) => {
                        window.sendMessageToParent('SET_EXPRESSION', exp);
                    },
                    updateAvatar: (url) => console.log('[ST Mock] Avatar update:', url),
                    loadPack: () => {}
                },
                characterSelect: {}
            },
            extensions: {
                quickReply: { enabled: true },
                expression: { enabled: true },
                characterSelect: { enabled: true }
            },
            util: {
                isMobile: () => window.is_mobile,
                delay: (ms) => new Promise(res => setTimeout(res, ms)),
                uuidv4: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => (c==='x'?Math.random()*16|0:(Math.random()*16|0)&0x3|0x8).toString(16)),
                renderMarkdown: (text) => {
                     let processed = text || '';
                     if(window.__st_context) {
                        processed = processed.replace(/{{char}}/g, window.__st_context.name2).replace(/{{user}}/g, window.__st_context.name1);
                     }
                     if (window.marked && window.marked.parse) return window.marked.parse(processed);
                     return processed;
                }
            },
            worldInfo: {
                get: () => window.__st_world_info || [],
            },
            files: {
                url: (p) => p
            },
            commands: {
                registerCommand: (name, cb) => { _cardStudio.log('info', 'Command Registered: ' + name); },
                runCommand: (cmd) => window.executeSlashCommands(cmd)
            },
            markdown: {
                render: (text) => {
                    if (window.marked && window.marked.parse) return window.marked.parse(text);
                    if (window.showdown) return (new window.showdown.Converter()).makeHtml(text);
                    return text;
                }
            },
            saveExtensionSettings: (settings) => {
                Object.assign(_extensionSettings, settings);
                window.parent.postMessage({ type: 'SAVE_EXTENSION_SETTINGS', payload: settings }, '*');
            },
            loadExtensionSettings: () => {
                return _extensionSettings;
            },
            loadCharacterData: async () => {
                 return window.__st_character_store || {};
            },
            saveCharacterData: async (data) => {
                 window.__st_character_store = data;
                 window.sendMessageToParent('SAVE_CHARACTER_DATA', data);
            },
            event: {
                on: window.eventOn,
                emit: window.eventEmit
            }
        };
        
        window.saveSettingsDebounced = window.ST.saveExtensionSettings;

        if (window.Zod) {
            window.z = window.Zod;
            try { if (!window.z.z) window.z.z = window.z; } catch (e) {}
        }

        window.waitGlobalInitialized = async (name) => true;
        window.getContext = () => window.__st_context;

        const _getVarFromStore = (path) => {
            let current = window.__st_live_data;
            if (current && current.stat_data) current = current.stat_data; // Unpack V3 wrapper if redundant
            if (!path) return current;
            
            const cleanPath = path.replace(/^stat_data\./, ''); // Strip prefix
            const parts = cleanPath.split('.');
            
            for (const key of parts) {
                if (current === undefined || current === null) return undefined;
                current = current[key];
            }
            return current;
        };

        window.getvar = (path) => _getVarFromStore(path);
        window.setvar = (key, val) => {
             if (!window.__st_live_data) window.__st_live_data = {};
             window.__st_live_data[key] = val;
             window.eventEmit('mvu-variable-update-ended', { stat_data: window.__st_live_data });
        };
        
        window.getCurrentMessageId = () => 'msg_mock_001';
        window.getChatMessages = () => window.__st_chat_history || [];
        
        window.getScriptId = () => 'script_default';
        
        window.getButtonEvent = (btnName) => {
            return 'btn_click_' + btnName;
        };

        window.replaceScriptButtons = (scriptId, buttons) => {
            window.parent.postMessage({ 
                type: 'UPDATE_SCRIPT_BUTTONS', 
                payload: { 
                    scriptId: scriptId || 'default',
                    buttons: buttons 
                } 
            }, '*');
        };
        
        window.Mvu = { 
            events: { VARIABLE_UPDATE_ENDED: 'mvu-variable-update-ended' }, 
            getMvuData: (opts) => {
                // Return structure { stat_data: ... } as expected by V3 scripts
                return { stat_data: window.__st_live_data };
            },
            getMvuVariable: (target, path, options) => {
                // Robust getter handling nested objects and tuple unwrapping
                let searchObj = target;
                
                // If path is absolute (e.g., 'stat_data.abc'), try global lookup
                if (path && path.startsWith('stat_data.') && !target) {
                    searchObj = { stat_data: window.__st_live_data };
                }
                
                // Normalize target: If target has stat_data, use it, unless path starts with stat_data
                if (target && target.stat_data && !path.startsWith('stat_data')) {
                    searchObj = target.stat_data;
                }

                if (!searchObj) searchObj = window.__st_live_data;

                const parts = path.split('.');
                let current = searchObj;
                
                for (let i = 0; i < parts.length; i++) {
                    if (current === undefined || current === null) break;
                    current = current[parts[i]];
                }
                
                if (current !== undefined) return current;
                return (options && options.default_value !== undefined) ? options.default_value : undefined;
            },
            extensions: { 
                TavernHelper: { 
                    getTavernHelperVersion: () => '1.0.0' 
                } 
            },
            _stubOp: (op, ...args) => { },
            set: (...args) => { }, 
            insert: (...args) => { },
            remove: (...args) => { }
        };
        window.TavernHelper = window.Mvu.extensions.TavernHelper;
        
        window.getwi = async (arg1, arg2) => {
            let bookName = null;
            let entryKey = '';
            
            // Handle Overloading: getwi('Key') vs getwi('Book', 'Key')
            if (arg2 === undefined) {
                entryKey = arg1; 
            } else {
                bookName = arg1;
                entryKey = arg2;
            }

            if (!window.__st_world_info || window.__st_world_info.length === 0) return '';
            
            // If still no key, dump all content (Legacy behavior)
            if (!entryKey) return window.__st_world_info.map(e => e.content).join('\\n');
            
            const entry = window.__st_world_info.find(e => {
                const commentMatch = e.comment && e.comment.trim() === entryKey;
                const keyMatch = e.keys && e.keys.includes(entryKey);
                return commentMatch || keyMatch;
            });
            return entry ? entry.content : '';
        };

        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const open = xhr.open;
            xhr.open = function(method, url) {
                const urlStr = String(url);
                const isLocal = !urlStr.startsWith('http') && !urlStr.startsWith('data:') && !urlStr.startsWith('blob:');
                
                if (isLocal) {
                    Object.defineProperty(xhr, 'response', { writable: true, value: {} });
                    Object.defineProperty(xhr, 'responseText', { writable: true, value: '{}' });
                    Object.defineProperty(xhr, 'status', { writable: true, value: 200 });
                    setTimeout(() => {
                        if (xhr.onload) xhr.onload({ target: xhr });
                        if (xhr.onreadystatechange) { xhr.readyState = 4; xhr.status = 200; xhr.onreadystatechange(); }
                    }, 5);
                    return;
                }
                return open.apply(this, arguments);
            };
            return xhr;
        };

        const originalFetch = window.fetch;
        window.fetch = async (url, options) => {
            const urlStr = String(url);
            
            if (urlStr.includes('/api/')) {
                 if (urlStr.includes('/characters') || urlStr.includes('/backgrounds') || urlStr.includes('/chats')) {
                      return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
                 }
                 return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            const isLocal = !urlStr.startsWith('http') && !urlStr.startsWith('data:') && !urlStr.startsWith('blob:');
            
            if (isLocal) {
                if (urlStr.match(/\\.js$/i)) {
                    return new Response('console.log("Mock JS loaded: ' + urlStr + '");', { status: 200, headers: { 'Content-Type': 'application/javascript' } });
                }
                if (urlStr.match(/\\.css$/i)) {
                    return new Response('/* Mock CSS */', { status: 200, headers: { 'Content-Type': 'text/css' } });
                }

                if (urlStr.match(/\\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
                    const filename = urlStr.split('/').pop().split('?')[0] || 'Image';
                    const svgDataUri = _createPlaceholderSvg(filename);
                    const res = await fetch(svgDataUri);
                    return new Response(await res.blob(), { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
                }
                if (urlStr.match(/\\.(mp3|wav|ogg|m4a)$/i)) {
                     const res = await fetch(_silentAudioBase64);
                     return new Response(await res.blob(), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
                }
                return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            
            return originalFetch(url, options);
        };
        
        window.toastr = {
            info: (m) => window.parent.postMessage({ type: 'SHOW_TOAST', payload: { type: 'info', message: m } }, '*'),
            success: (m) => window.parent.postMessage({ type: 'SHOW_TOAST', payload: { type: 'success', message: m } }, '*'),
            error: (m) => window.parent.postMessage({ type: 'SHOW_TOAST', payload: { type: 'error', message: m } }, '*'),
            warning: (m) => window.parent.postMessage({ type: 'SHOW_TOAST', payload: { type: 'warning', message: m } }, '*'),
            clear: () => {},
            options: {}
        };
        window.callPopup = (content, type) => window.parent.postMessage({ type: 'SHOW_POPUP', payload: { html: content, type: type || 'popup' } }, '*');
        
        window.hide_mes = () => {};
        window.show_mes = () => {};
        window.PlaySound = (url) => {
             window.play_audio(url);
        };
        window.ClickSound = () => {};
        
        const handleDataUpdate = (payload) => {
             if (!payload) return;
             if (payload.stat_data) {
                 window.__st_live_data = payload.stat_data;
                 window.stat_data = window.__st_live_data;
             }
             if (payload.context) window.__st_context = { ...window.__st_context, ...payload.context };
             if (payload.chat_history) {
                 window.__st_chat_history = payload.chat_history;
                 if(window.ST && window.ST.chat) window.ST.chat.history = payload.chat_history;
             }
             if (payload.world_info) window.__st_world_info = payload.world_info;

             window.eventEmit(window.Mvu.events.VARIABLE_UPDATE_ENDED, { stat_data: window.__st_live_data });
             
             const legacyFunctions = ['initDisplay', 'updateStatus', 'refreshDisplay', 'updateUI', 'render', 'renderShops', 'renderPackages', 'renderDetails'];
             legacyFunctions.forEach(funcName => {
                if (typeof window[funcName] === 'function' && !window[funcName].toString().includes('[native code]')) {
                    try { window[funcName](); } catch(e) {}
                }
             });
        };

        window.addEventListener('message', (event) => {
            const { type, payload } = event.data || {};
            
            if (type === 'HANDSHAKE_ACK') {
                 _isHandshakeComplete = true;
                 handleDataUpdate(payload);
                 
                 // ST Standard: Set window.this_mes to point to the message div
                 window.this_mes = document.getElementById('msg_mock_001');
                 
                 window.eventEmit(window.tavern_events.CHAT_CHANGED, window.__st_context);
                 window.eventEmit(window.tavern_events.SETTINGS_UPDATED, _extensionSettings);
                 
                 window.eventEmit('character_loaded', { name: '${characterName.replace(/'/g, "\\'")}' });
                 window.eventEmit(window.tavern_events.EXTENSION_SETTINGS_LOADED);
                 
                 const overlay = document.getElementById('st-loading-overlay');
                 if (overlay) overlay.style.display = 'none';
                 
                 window.dispatchEvent(new Event('load'));
                 if (typeof window.onLoad === 'function') window.onLoad();
                 
                 if (window.$) window.$(document).trigger('ready');
            }
            if (type === 'CARD_STUDIO_VARIABLE_UPDATE' && _isHandshakeComplete) handleDataUpdate(payload);
            if (type === 'CARD_STUDIO_HISTORY_UPDATE' && _isHandshakeComplete) handleDataUpdate({ chat_history: payload.chat_history });
            
            if (type === 'GENERATION_STARTED') window.eventEmit(window.tavern_events.GENERATION_STARTED);
            if (type === 'GENERATION_ENDED') window.eventEmit(window.tavern_events.MESSAGE_RECEIVED);
            
            if (type === 'EXECUTE_BUTTON_SCRIPT') {
                 const eventName = 'btn_click_' + payload.buttonName;
                 window.eventEmit(eventName);
            }
            
            if (type === 'CHECK_STATE') _cardStudio.log('state', 'State Inspection', { live_data: window.__st_live_data, ext_settings: _extensionSettings });
        });

        const initResizeObserver = () => {
             try {
                const resizeObserver = new ResizeObserver(entries => {
                    const height = document.body.scrollHeight;
                    window.parent.postMessage({ type: 'CARD_STUDIO_IFRAME_RESIZE', height }, '*');
                });
                resizeObserver.observe(document.body);
             } catch(e) {}
        };

        const startHandshake = () => {
             initResizeObserver();
             if (!window.$ && window.jQuery) window.$ = window.jQuery;
             window.parent.postMessage({ type: 'HANDSHAKE_INIT' }, '*');
        };

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            startHandshake();
        } else {
            document.addEventListener('DOMContentLoaded', startHandshake);
        }
    `;
    
    const processedHtml = htmlContent
        .replace(/{{char}}/g, characterName)
        .replace(/{{user}}/g, userPersonaName)
        .replace(/{{user_avatar}}/g, userAvatarUrl || '') 
        .replace(/{{charId}}/g, characterId)
        .replace(/{{lastMessageId}}/g, "msg_mock_001")
        .replace(/{{lastMessage}}/g, "")
        .replace(/{{is_group}}/g, "false"); 
        
    const cleanHtmlContent = processedHtml.replace(/```(?:text|html|xml|javascript)?\s*([\s\S]*?)\s*```/gi, '$1').trim();

    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtmlContent, 'text/html');
    
    const cardStyles = Array.from(doc.querySelectorAll('style')).map(style => style.outerHTML).join('\n');
    
    const allScriptsToExecute: { name: string; content: string; type: 'module' | 'classic' }[] = [];

    const processScriptContent = (scriptContent: string) => {
        let content = scriptContent
            .replace(/{{char}}/g, characterName)
            .replace(/{{user}}/g, userPersonaName)
            .replace(/{{charId}}/g, characterId);
        
        content = content.replace(/(window\.|)(parent|top)\.document/g, 'window.__st_parent_mock');
        return content;
    };

    (scripts || []).forEach(s => {
        if (s.type === 'script' && s.value.enabled && s.value.content) {
             allScriptsToExecute.push({ 
                 name: s.value.name || s.value.id, 
                 content: processScriptContent(s.value.content.trim()), 
                 type: 'module' 
             });
        }
    });

    const inlineHtmlScripts = Array.from(doc.querySelectorAll('script')).map(script => {
        const content = script.textContent || '';
        return { 
            name: 'Inline HTML Script', 
            content: processScriptContent(content), 
            type: (script.type === 'module' || content.includes('import ')) ? 'module' : 'classic' as 'module' | 'classic' 
        };
    });
    
    doc.querySelectorAll('script').forEach(script => script.remove());
    allScriptsToExecute.push(...inlineHtmlScripts);
    
    const cardBodyContent = doc.head.innerHTML + doc.body.innerHTML;
    const filteredScriptsToExecute = allScriptsToExecute.filter(s => s.content);

    const scriptsJson = safeJson(filteredScriptsToExecute);
    const bodyContentJson = safeJson(cardBodyContent);

    // MOCK MESSAGE STRUCTURE
    const mockMessageHtml = `
        <div id="chat">
            <div class="mes chat_msg" id="msg_mock_001">
                <div class="mes_block">
                    <div class="avatar_container">
                        <img src="${safeAvatar}" class="avatar" />
                    </div>
                    <div class="mes_content">
                        <div class="ch_name">${characterName}</div>
                        <div class="mes_text" id="target_mes_text"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const starterLogicScript = `
      document.addEventListener('DOMContentLoaded', async () => {
          // Logic: Find the inner text container to inject card content
          const chatContainer = document.getElementById('target_mes_text') || document.getElementById('chat') || document.body;
          const cardBodyContent = ${bodyContentJson};
          
          const appDiv = document.createElement('div'); appDiv.id = 'app';
          if(chatContainer) chatContainer.appendChild(appDiv);

          try {
              const ejsLib = window.EjsTemplate || window.ejs;
              if (ejsLib && typeof ejsLib.render === 'function') {
                  const renderContext = {
                      getvar: window.getvar,
                      getwi: window.getwi,
                      toastr: window.toastr,
                  };
                  const renderedHtml = await ejsLib.render(cardBodyContent, renderContext, { async: true });
                  // Inject inside the text bubble
                  chatContainer.innerHTML = renderedHtml;
              } else {
                  chatContainer.innerHTML = cardBodyContent;
              }
          } catch(e) {
              _cardStudio.log('error', 'EJS Render Failed', { stack: e.stack });
              chatContainer.innerHTML = cardBodyContent;
          }
          
          const scriptsToRun = ${scriptsJson};
          const runSafeScript = (scriptInfo) => {
              return new Promise((resolve) => {
                  try {
                      const scriptEl = document.createElement('script');
                      if (scriptInfo.type === 'module') scriptEl.type = 'module';
                      
                      if (scriptInfo.type === 'module') {
                          scriptEl.textContent = scriptInfo.content;
                      } else {
                          scriptEl.text = 'try {\\n' + scriptInfo.content + '\\n} catch(e) { window._cardStudio.log("script-error", "Script failed: '+scriptInfo.name+'", {stack: e.stack}); }';
                      }
                      
                      scriptEl.onload = resolve;
                      scriptEl.onerror = resolve;
                      document.body.appendChild(scriptEl);
                      if (!scriptEl.src) resolve();
                  } catch (e) {
                      _cardStudio.log('script-error', 'Script Injection Failed', { stack: e.stack });
                      resolve();
                  }
              });
          };

          for (let i = 0; i < scriptsToRun.length; i++) {
              await runSafeScript(scriptsToRun[i]);
          }
      });
    `;

    return (
      '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + 
      '<script async src="https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js"></script>' +
      
      '<script src="https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://unpkg.com/vue@3.4.27/dist/vue.global.js" crossorigin="anonymous"></script>' +
      '<script src="https://code.jquery.com/jquery-3.7.1.min.js" crossorigin="anonymous" onerror="this.onerror=null;this.src=\'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js\'"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/ejs@3.1.9/ejs.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/zod@3.23.8/lib/index.umd.min.js" crossorigin="anonymous"></script>' +
      
      '<script src="https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>' +
      '<script src="https://cdn.tailwindcss.com"></script>' + 
      
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.3.2/pixi.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js" crossorigin="anonymous"></script>' +
      
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>' +

      '<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" crossorigin="anonymous"></script>' +
      '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>' +
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>' +

      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" />' +
      
      '<style>' + DEFAULT_THEME_CSS + '</style>' +
      '<script>' + bootstrapScript + '</script>' +
      cardStyles +
      '</head><body>' +
      '<div id="sheld"></div>' + 
      '<div id="wrapper"><div id="content">' +
      '<div id="main">' + mockMessageHtml + '</div>' +
      '</div></div>' +
      '<script>' + starterLogicScript + '</script>' +
      '</body></html>'
    );
}, [htmlContent, scripts, originalContent, characterName, userPersonaName, characterId, chatId, extensionSettings, initialData, userAvatarUrl, chatHistory]);

  return (
    <iframe
      ref={ref}
      srcDoc={finalHtml}
      style={{
        width: '100%',
        minWidth: '320px', 
        height: typeof iframeHeight === 'number' ? `${iframeHeight}px` : iframeHeight, 
        border: 'none',
        backgroundColor: 'transparent',
        transition: 'height 0.3s ease-out',
        overflow: 'hidden', 
      }}
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms allow-pointer-lock"
      title={`Thẻ tương tác của ${characterName}`}
      onLoad={onLoad}
    />
  );
});
