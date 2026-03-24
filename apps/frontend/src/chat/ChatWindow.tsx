import type { Chat } from "./types";

export const ChatWindow: React.FC<{ chat: Chat }> = ({ chat }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
        <h2>{chat.name}</h2>
      </div>

      {/* Message List */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fff' }}>
        {chat.messages.map(m => (
          <div key={m.id} style={{ marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{m.sender}</div>
            <div style={{ background: '#e1ffc7', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div style={{ padding: '20px', borderTop: '1px solid #ddd' }}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          style={{ width: '80%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
        />
        <button style={{ width: '15%', marginLeft: '2%', padding: '10px' }}>Send</button>
      </div>
    </div>
  );
};