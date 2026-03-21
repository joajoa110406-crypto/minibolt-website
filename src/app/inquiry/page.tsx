'use client';

import { useState, useRef } from 'react';
import { COMPANY_INFO } from '@/lib/company-info';

const ITEM_CATEGORIES = [
  { icon: '🔩', name: '절삭 스크류', desc: '특수 사양 절삭 가공' },
  { icon: '🔧', name: '너트', desc: '각종 규격 너트' },
  { icon: '⚙️', name: '와셔', desc: '평와셔, 스프링와셔 등' },
  { icon: '🏗️', name: '특수볼트', desc: '비표준 특수 볼트' },
  { icon: '📌', name: '리벳', desc: '블라인드, 솔리드 리벳' },
  { icon: '📏', name: '스페이서', desc: '각종 스페이서, 스탠드오프' },
  { icon: '🔗', name: '기타 체결부품', desc: '핀, 클립, 인서트 등' },
];

const ACCEPTED_FILES = '.pdf,.dwg,.dxf,.jpg,.jpeg,.png,.step,.stp,.iges,.igs';

interface FormData {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  itemDescription: string;
  quantity: string;
  desiredDelivery: string;
}

const INITIAL_FORM: FormData = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  itemDescription: '',
  quantity: '',
  desiredDelivery: '',
};

export default function InquiryPage() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하만 가능합니다.');
        e.target.value = '';
        return;
      }
      setFile(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim() ||
        !form.email.trim() || !form.itemDescription.trim() || !form.quantity.trim()) {
      setResult({ success: false, message: '필수 항목을 모두 입력해주세요.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setResult({ success: false, message: '올바른 이메일 주소를 입력해주세요.' });
      return;
    }

    setSubmitting(true);
    try {
      const body = new globalThis.FormData();
      Object.entries(form).forEach(([key, val]) => body.append(key, val));
      if (file) body.append('file', file);

      const res = await fetch('/api/inquiry', { method: 'POST', body });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ success: true, message: data.message || '견적 문의가 접수되었습니다. 빠른 시일 내에 연락드리겠습니다.' });
        setForm(INITIAL_FORM);
        setFile(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        setResult({ success: false, message: data.error || '문의 접수 중 오류가 발생했습니다.' });
      }
    } catch {
      setResult({ success: false, message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #2c3e50, #34495e)',
        color: '#fff', padding: '80px 20px 50px', textAlign: 'center',
      }}>
        <h1 className="inquiry-hero-title" style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          체결 부품 수배 및 견적 서비스
        </h1>
        <p className="inquiry-hero-desc" style={{ fontSize: '1.1rem', color: '#ccd6e0', maxWidth: 700, margin: '0 auto', lineHeight: 1.8 }}>
          스크류, 볼트, 너트 등 체결 부품이면 무엇이든 수배 가능합니다.<br />
          39년 경력의 성원특수금속이 최적의 부품을 찾아드립니다.
        </p>
      </section>

      <div className="inquiry-content" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 20px 4rem' }}>
        {/* Item Categories */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#333', marginBottom: '1.5rem', textAlign: 'center' }}>
            수배 가능 품목
          </h2>
          <div className="inquiry-categories">
            {ITEM_CATEGORIES.map(cat => (
              <div key={cat.name} className="inquiry-cat-card">
                <div className="inquiry-cat-icon">{cat.icon}</div>
                <div className="inquiry-cat-name">{cat.name}</div>
                <div className="inquiry-cat-desc">{cat.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quote Form */}
        <section style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#333', marginBottom: '0.5rem' }}>
            견적 문의
          </h2>
          <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            아래 양식을 작성해주시면 빠른 시일 내에 견적서를 보내드립니다.
          </p>

          {result && (
            <div className={`inquiry-result ${result.success ? 'success' : 'error'}`}>
              {result.success ? '✅' : '⚠️'} {result.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="inquiry-form-grid">
              <div className="inquiry-field">
                <label className="inquiry-label">회사명 <span className="inquiry-required">*</span></label>
                <input type="text" name="companyName" value={form.companyName} onChange={handleChange}
                  placeholder="예: 성원특수금속" className="inquiry-input" maxLength={100} />
              </div>
              <div className="inquiry-field">
                <label className="inquiry-label">담당자명 <span className="inquiry-required">*</span></label>
                <input type="text" name="contactName" value={form.contactName} onChange={handleChange}
                  placeholder="예: 홍길동" className="inquiry-input" maxLength={50} />
              </div>
              <div className="inquiry-field">
                <label className="inquiry-label">연락처 <span className="inquiry-required">*</span></label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="예: 010-1234-5678" className="inquiry-input" maxLength={20} />
              </div>
              <div className="inquiry-field">
                <label className="inquiry-label">이메일 <span className="inquiry-required">*</span></label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="예: hong@company.com" className="inquiry-input" maxLength={100} />
              </div>
            </div>

            <div className="inquiry-field" style={{ marginTop: '1rem' }}>
              <label className="inquiry-label">필요 품목 설명 <span className="inquiry-required">*</span></label>
              <textarea name="itemDescription" value={form.itemDescription} onChange={handleChange}
                placeholder="품목명, 규격(M사이즈, 길이, 재질, 도금 등), 용도 등을 자세히 기재해주세요."
                className="inquiry-textarea" maxLength={5000} rows={5} />
            </div>

            <div className="inquiry-form-grid" style={{ marginTop: '1rem' }}>
              <div className="inquiry-field">
                <label className="inquiry-label">수량 <span className="inquiry-required">*</span></label>
                <input type="text" name="quantity" value={form.quantity} onChange={handleChange}
                  placeholder="예: 10,000개" className="inquiry-input" maxLength={50} />
              </div>
              <div className="inquiry-field">
                <label className="inquiry-label">희망 납기</label>
                <input type="text" name="desiredDelivery" value={form.desiredDelivery} onChange={handleChange}
                  placeholder="예: 2주 이내" className="inquiry-input" maxLength={50} />
              </div>
            </div>

            <div className="inquiry-field" style={{ marginTop: '1rem' }}>
              <label className="inquiry-label">도면 첨부 <span style={{ color: '#aaa', fontWeight: 400 }}>(선택)</span></label>
              <input ref={fileRef} type="file" accept={ACCEPTED_FILES} onChange={handleFileChange}
                className="inquiry-file-input" />
              <p style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.35rem' }}>
                PDF, DWG, DXF, STEP, IGES, JPG, PNG (최대 10MB)
              </p>
              {file && (
                <div style={{ fontSize: '0.85rem', color: '#ff6b35', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                  <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting} className="inquiry-submit-btn">
              {submitting ? '접수 중...' : '견적 문의하기'}
            </button>
          </form>
        </section>

        {/* Phone CTA */}
        <section className="inquiry-phone-section">
          <div className="inquiry-phone-card">
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '0.75rem' }}>
              급하신 건은 전화로 문의하세요
            </p>
            <a href={`tel:${COMPANY_INFO.phone}`} className="inquiry-phone-number">
              📞 {COMPANY_INFO.phone}
            </a>
            <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.75rem' }}>
              {COMPANY_INFO.operatingHours}
            </p>
          </div>
        </section>
      </div>

      <style>{`
        .inquiry-categories {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }
        .inquiry-cat-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.25rem 1rem;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: default;
        }
        .inquiry-cat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .inquiry-cat-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .inquiry-cat-name { font-size: 0.9rem; font-weight: 700; color: #333; margin-bottom: 0.25rem; }
        .inquiry-cat-desc { font-size: 0.75rem; color: #888; }

        .inquiry-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .inquiry-field { display: flex; flex-direction: column; }
        .inquiry-label {
          font-size: 0.85rem; font-weight: 600; color: #444; margin-bottom: 0.35rem;
        }
        .inquiry-required { color: #e74c3c; }
        .inquiry-input {
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          min-height: 44px;
          transition: border-color 0.2s;
          outline: none;
          font-family: inherit;
        }
        .inquiry-input:focus { border-color: #ff6b35; }
        .inquiry-textarea {
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.95rem;
          resize: vertical;
          min-height: 120px;
          transition: border-color 0.2s;
          outline: none;
          font-family: inherit;
        }
        .inquiry-textarea:focus { border-color: #ff6b35; }
        .inquiry-file-input {
          padding: 0.75rem;
          border: 2px dashed #e0e0e0;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          background: #fafafa;
          min-height: 44px;
        }
        .inquiry-file-input:hover { border-color: #ff6b35; }

        .inquiry-submit-btn {
          width: 100%;
          padding: 1rem;
          background: #ff6b35;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 1.5rem;
          min-height: 52px;
          transition: background 0.2s, transform 0.1s;
        }
        .inquiry-submit-btn:hover:not(:disabled) { background: #e55a28; }
        .inquiry-submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .inquiry-submit-btn:disabled { background: #ccc; cursor: not-allowed; }

        .inquiry-result {
          padding: 1rem;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
          font-weight: 600;
        }
        .inquiry-result.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .inquiry-result.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

        .inquiry-phone-section { margin-top: 2.5rem; }
        .inquiry-phone-card {
          background: #fff;
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .inquiry-phone-number {
          font-size: 2rem;
          font-weight: 800;
          color: #ff6b35;
          text-decoration: none;
          display: inline-block;
        }
        .inquiry-phone-number:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .inquiry-hero-title { font-size: 1.6rem !important; }
          .inquiry-hero-desc { font-size: 0.95rem !important; }
          .inquiry-form-grid { grid-template-columns: 1fr; }
          .inquiry-categories { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; }
          .inquiry-cat-card { padding: 1rem 0.75rem; }
          .inquiry-cat-icon { font-size: 1.5rem; }
          .inquiry-cat-name { font-size: 0.8rem; }
          .inquiry-cat-desc { font-size: 0.7rem; }
          .inquiry-phone-number { font-size: 1.5rem; }
          .inquiry-content { padding: 1.5rem 16px 3rem !important; }
        }
      `}</style>
    </div>
  );
}
