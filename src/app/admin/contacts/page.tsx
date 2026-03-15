'use client';

import { useCallback, useEffect, useState } from 'react';
import { csrfFetch } from '@/lib/csrf-client';

interface ContactRecord {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  category: string;
  subject: string;
  message: string;
  order_number: string | null;
  auto_reply_sent: boolean;
  status: string;
  admin_reply: string | null;
  replied_by: string | null;
  reply_date: string | null;
  priority: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기중' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '답변완료' },
  { value: 'closed', label: '종결' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'shipping', label: '배송' },
  { value: 'product', label: '상품' },
  { value: 'payment', label: '결제' },
  { value: 'return', label: '반품/교환' },
  { value: 'other', label: '기타' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  in_progress: '처리중',
  resolved: '답변완료',
  closed: '종결',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f39c12',
  in_progress: '#3498db',
  resolved: '#27ae60',
  closed: '#888',
};

const CATEGORY_LABELS: Record<string, string> = {
  shipping: '배송',
  product: '상품',
  payment: '결제',
  return: '반품/교환',
  other: '기타',
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  // 답변 모달
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/contacts?${params}`);
      const data = await res.json();

      if (res.ok) {
        setContacts(data.contacts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('문의 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function openReplyModal(contact: ContactRecord) {
    setSelectedContact(contact);
    setAdminReply(contact.admin_reply || '');
    setReplyError('');
  }

  async function handleSubmitReply() {
    if (!selectedContact) return;
    if (!adminReply.trim()) {
      setReplyError('답변 내용을 입력해주세요.');
      return;
    }

    setReplyLoading(true);
    setReplyError('');

    try {
      const res = await csrfFetch(`/api/admin/contacts/${selectedContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminReply: adminReply.trim(),
          status: 'resolved',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReplyError(data.error || '답변 등록에 실패했습니다.');
        return;
      }

      setSelectedContact(null);
      setAdminReply('');
      fetchContacts();
    } catch {
      setReplyError('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setReplyLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#333', marginBottom: '1.5rem' }}>
        문의 관리
      </h1>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem' }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem' }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="제목 또는 고객명 검색"
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.9rem', minWidth: 200 }}
        />
        <span style={{ color: '#888', fontSize: '0.875rem', alignSelf: 'center' }}>
          총 {total}건
        </span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>로딩 중...</p>
      ) : contacts.length === 0 ? (
        <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>문의 내역이 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse', fontSize: '0.875rem', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555' }}>제목</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#555' }}>고객</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>분류</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>상태</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>자동응답</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>접수일</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#555' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.subject}
                    {c.order_number && (
                      <span style={{ display: 'block', color: '#888', fontSize: '0.8rem' }}>
                        주문: {c.order_number}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {c.customer_name}
                    <br />
                    <span style={{ color: '#888', fontSize: '0.8rem' }}>{c.customer_email}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem' }}>
                    {CATEGORY_LABELS[c.category] || c.category}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#fff',
                      background: STATUS_COLORS[c.status] || '#888',
                    }}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem' }}>
                    {c.auto_reply_sent ? (
                      <span style={{ color: '#27ae60', fontWeight: 600 }}>O</span>
                    ) : (
                      <span style={{ color: '#ccc' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => openReplyModal(c)}
                      style={{
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: c.admin_reply ? '#e8f5e9' : '#fff3e0',
                        color: c.admin_reply ? '#27ae60' : '#ff6b35',
                      }}
                    >
                      {c.admin_reply ? '답변 확인' : '답변하기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1.5rem' }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
          >
            이전
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.9rem', color: '#555' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            다음
          </button>
        </div>
      )}

      {/* 답변 모달 */}
      {selectedContact && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedContact(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '2rem',
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
              문의 상세 / 답변
            </h3>

            {/* 문의 정보 */}
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666', width: 80 }}>고객</td>
                  <td style={{ padding: '6px 0', fontWeight: 600 }}>{selectedContact.customer_name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>이메일</td>
                  <td style={{ padding: '6px 0' }}>{selectedContact.customer_email}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>분류</td>
                  <td style={{ padding: '6px 0' }}>{CATEGORY_LABELS[selectedContact.category] || selectedContact.category}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', color: '#666' }}>제목</td>
                  <td style={{ padding: '6px 0', fontWeight: 600 }}>{selectedContact.subject}</td>
                </tr>
                {selectedContact.order_number && (
                  <tr>
                    <td style={{ padding: '6px 0', color: '#666' }}>주문번호</td>
                    <td style={{ padding: '6px 0' }}>{selectedContact.order_number}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 문의 내용 */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#555' }}>문의 내용</p>
              <p style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedContact.message}
              </p>
            </div>

            {/* 기존 답변 (있으면) */}
            {selectedContact.admin_reply && (
              <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, color: '#155724' }}>
                  기존 답변 ({selectedContact.replied_by && `by ${selectedContact.replied_by}`})
                </p>
                <p style={{ fontSize: '0.9rem', color: '#155724', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedContact.admin_reply}
                </p>
              </div>
            )}

            {/* 답변 입력 */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>
                {selectedContact.admin_reply ? '답변 수정' : '답변 작성'}
              </label>
              <textarea
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                rows={5}
                placeholder="답변 내용을 입력해주세요"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {replyError && (
              <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '1rem' }}>{replyError}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setSelectedContact(null)}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: '#eee',
                  color: '#333',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
              <button
                onClick={handleSubmitReply}
                disabled={replyLoading}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  background: '#ff6b35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: replyLoading ? 'not-allowed' : 'pointer',
                  opacity: replyLoading ? 0.6 : 1,
                }}
              >
                {replyLoading ? '전송 중...' : '답변 전송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
