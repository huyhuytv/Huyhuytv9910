
import React, { useState } from 'react';

const macroData = [
  { name: '{{char}}', description: 'Chèn tên của nhân vật đang hoạt động.' },
  { name: '{{user}}', description: 'Chèn tên của người dùng (từ Persona nếu có, mặc định là "User").' },
  { name: '{{user_input}}', description: 'Chèn tin nhắn mới nhất của người dùng. ({{prompt}} cũng hoạt động)' },
  { name: '{{long_term_summary}}', description: 'Trí nhớ dài hạn: Chèn tóm tắt của các "trang" hội thoại đã qua.' },
  { name: '{{current_page_history}}', description: 'Trí nhớ ngắn hạn: Chèn lịch sử của "trang" hội thoại hiện tại.' },
  { name: '{{last_turn}}', description: 'Ngữ cảnh tức thời: Chèn lượt trao đổi ngay trước đó.' },
  { name: '{{author_note}}', description: 'Chèn Ghi chú của Tác giả bền bỉ từ cài đặt phiên trò chuyện.' },
  { name: '{{smart_state_block}}', description: 'Thông minh chèn <LogicStore> (Biến số) và <VisualInterface> (HTML State) nếu chúng tồn tại. Tự động ẩn nếu không có dữ liệu.' },
  { name: '{{mythic_database}}', description: 'Chèn toàn bộ bảng dữ liệu RPG (Mythic Engine) dưới dạng Markdown.' },
  { name: '{{worldInfo_before}}', description: 'Chèn các mục World Info được cấu hình ở vị trí "Đầu" (Thường là Quy tắc, Bối cảnh chung).' },
  { name: '{{worldInfo_after}}', description: 'Chèn các mục World Info được cấu hình ở vị trí "Cuối" (Thường là Ngữ cảnh cụ thể, Trạng thái, Đồ vật).' },
  { name: '{{worldInfo}}', description: 'Chèn toàn bộ các mục World Info đã được bật (Gộp cả Before và After - Dùng cho tương thích ngược).' },
  { name: '{{description}}', description: 'Chèn toàn bộ nội dung từ trường "Mô tả" của nhân vật.' },
  { name: '{{personality}}', description: 'Chèn toàn bộ nội dung từ trường "Tính cách" của nhân vật.' },
  { name: '{{scenario}}', description: 'Chèn toàn bộ nội dung từ trường "Kịch bản" của nhân vật.' },
  { name: '{{first_mes}}', description: 'Chèn lời chào đầu tiên của nhân vật.' },
  { name: '{{mes_example}}', description: 'Chèn các ví dụ hội thoại để định hình văn phong của nhân vật.' },
  { name: '{{char_persona}}', description: 'Chèn nội dung từ trường "Vai trò" (Persona) của thẻ nhân vật.' },
  { name: '{{persona_description}}', description: 'Chèn mô tả từ Persona đang hoạt động của người dùng.' },
  { name: '{{system_prompt}}', description: 'Chèn "Gợi ý hệ thống" từ thẻ nhân vật.' },
  { name: '{{post_history_instructions}}', description: 'Chèn "Chỉ dẫn sau lịch sử" từ thẻ nhân vật.' },
  { name: '{{all_definitions}}', description: 'Một biến tiện ích, chèn gộp Mô tả, Tính cách, Kịch bản và Ví dụ hội thoại.' },
  { name: '{{random:a,b,c}}', description: 'Chọn ngẫu nhiên một giá trị. Ví dụ: {{random:vui,buồn}} hoặc số {{random:1,100}}.' },
  { name: '{{dice:XdY+Z}}', description: 'Tung xúc xắc kiểu RPG. Ví dụ: {{dice:1d20+5}} (1 xúc xắc 20 mặt cộng 5).' },
  { name: '{{getvar::tên_biến}}', description: 'Lấy giá trị của một biến cụ thể vào prompt. Ví dụ: {{getvar::stat_data.hp}}.' },
];

const MacroItem: React.FC<{ macro: typeof macroData[0] }> = ({ macro }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(macro.name).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-md hover:bg-slate-700 transition-colors">
      <div className="flex-grow mr-4">
        <code className="text-sky-400 font-mono text-sm font-bold block mb-1">{macro.name}</code>
        <p className="text-xs text-slate-400">{macro.description}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 bg-slate-600 hover:bg-slate-500 rounded-md text-slate-300 hover:text-white transition-colors flex-shrink-0 group"
        title={copied ? "Đã sao chép!" : `Sao chép ${macro.name}`}
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
        )}
      </button>
    </div>
  );
};

export const MacroReference: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <details className="bg-slate-800/50 rounded-xl shadow-lg open:mb-6 transition-all duration-300 border border-slate-700/50" open={isExpanded} onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}>
      <summary className="p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center hover:bg-slate-800/80 rounded-xl transition-colors">
        <span className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            Tham khảo Biến giữ chỗ (Macros)
        </span>
        <svg className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {macroData.map(macro => (
          <MacroItem key={macro.name} macro={macro} />
        ))}
      </div>
    </details>
  );
};
