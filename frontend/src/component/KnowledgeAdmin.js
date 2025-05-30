import React, { useState, useEffect, useRef } from "react";

export default function KnowledgeAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", content: "", id: null });
  const formRef = useRef(null);

  // Lấy danh sách kiến thức
  const fetchList = async () => {
    const res = await fetch("http://localhost:3001/knowledge");
    const data = await res.json();
    setList(data);
  };
  useEffect(() => { fetchList(); }, []);

  // Thêm hoặc sửa kiến thức
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = form.id
      ? `http://localhost:3001/knowledge/${form.id}`
      : "http://localhost:3001/knowledge";
    const method = form.id ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, content: form.content }),
    });
    setForm({ title: "", content: "", id: null });
    fetchList();
    // Scroll lên form khi thêm/sửa
    if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth" });
  };

  // Xóa kiến thức
  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa kiến thức này?")) {
      await fetch(`http://localhost:3001/knowledge/${id}`, { method: "DELETE" });
      setList(list.filter(item => item.id !== id));
      // Nếu đang sửa chính mục này, reset form
      if (form.id === id) setForm({ title: "", content: "", id: null });
    }
  };

  // Bắt đầu sửa kiến thức
  const handleEdit = (item) => {
    setForm(item);
    if (formRef.current) formRef.current.scrollIntoView({ behavior: "smooth" });
  };

  // Hủy thao tác sửa
  const handleCancel = () => setForm({ title: "", content: "", id: null });

  return (
    <div style={{
      maxWidth: 700,
      margin: "40px auto",
      background: "#fff",
      padding: "2em",
      borderRadius: 18,
      boxShadow: "0 6px 32px 0 rgba(0,0,0,0.10)",
      fontFamily: "Segoe UI, Arial, sans-serif"
    }}>
      <h2 style={{
        color: "#4f3ed7",
        textAlign: "center",
        marginBottom: 28,
        fontWeight: 800,
        letterSpacing: 1
      }}>
        🧠 Quản Lý Kiến Thức
      </h2>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          background: "#f8f7ff",
          padding: 18,
          borderRadius: 12,
          marginBottom: 30,
          boxShadow: "0 1px 8px 0 rgba(79,62,215,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
        <input
          placeholder="Tiêu đề kiến thức..."
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          maxLength={200}
          style={{
            fontSize: 18,
            padding: "10px 16px",
            border: "1.5px solid #e3e0fd",
            borderRadius: 8,
            outline: "none"
          }}
        />
        <textarea
          placeholder="Nội dung kiến thức..."
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          required
          rows={5}
          style={{
            fontSize: 16,
            padding: "10px 16px",
            border: "1.5px solid #e3e0fd",
            borderRadius: 8,
            outline: "none",
            minHeight: 90
          }}
        />
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            style={{
              background: "#4f3ed7",
              color: "#fff",
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              transition: "background .2s"
            }}
          >
            {form.id ? "Cập nhật" : "Thêm"}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={handleCancel}
              style={{
                background: "#e5e5e5",
                color: "#4f3ed7",
                fontWeight: 700,
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer"
              }}
            >Hủy</button>
          )}
        </div>
      </form>

      <div>
        <h3 style={{
          color: "#22223b",
          borderBottom: "1.5px solid #e3e0fd",
          paddingBottom: 10,
          marginBottom: 20,
          fontWeight: 700
        }}>
          📚 Danh sách kiến thức đã thêm
        </h3>
        {list.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center" }}>
            Chưa có kiến thức nào!
          </div>
        ) : (
          <div style={{
            display: "grid",
            gap: 18
          }}>
            {list.map(item => (
              <div key={item.id} style={{
                background: "#f3f0fc",
                borderLeft: "5px solid #4f3ed7",
                borderRadius: 10,
                padding: "16px 18px",
                boxShadow: "0 1px 6px 0 rgba(79,62,215,0.08)",
                position: "relative"
              }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: 17,
                  marginBottom: 8,
                  color: "#322b6d"
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize: 16,
                  color: "#444",
                  whiteSpace: "pre-line",
                  marginBottom: 12
                }}>
                  {item.content}
                </div>
                <div style={{
                  display: "flex",
                  gap: 10,
                  position: "absolute",
                  top: 16,
                  right: 18
                }}>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      background: "#fff",
                      border: "1.2px solid #4f3ed7",
                      color: "#4f3ed7",
                      borderRadius: 6,
                      padding: "4px 13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginRight: 3
                    }}
                  >Sửa</button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: "#ffeded",
                      border: "1.2px solid #ed6060",
                      color: "#ed6060",
                      borderRadius: 6,
                      padding: "4px 13px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
