'use client';

import { useState } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/csrf-client';

const CATEGORIES = ['바인드헤드', '팬헤드', '플랫헤드', '마이크로스크류/평머리'];
const COLORS = ['블랙', '니켈'];
const DIAMETERS = ['1.2', '1.4', '1.6', '1.7', '2', '2.5', '3'];

interface PreviewItem {
  product_id: string;
  name: string;
  category: string;
  color: string;
  diameter: string;
  price_unit_before: number;
  price_unit_after: number;
}

export default function BulkPricePage() {
  // Step 1: 조건
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedDiameters, setSelectedDiameters] = useState<string[]>([]);

  // Step 2: 변경 방식
  const [changeType, setChangeType] = useState<'percent' | 'absolute'>('percent');
  const [changeAmount, setChangeAmount] = useState('');
  const [reason, setReason] = useState('');

  // Step 3: 미리보기
  const [preview, setPreview] = useState<PreviewItem[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 적용
  const [applying, setApplying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  // 미리보기 조회
  const handlePreview = async () => {
    const amount = parseFloat(changeAmount);
    if (isNaN(amount) || amount === 0) {
      setToast('변경 금액/비율을 입력해주세요.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await csrfFetch('/api/admin/products/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            colors: selectedColors.length > 0 ? selectedColors : undefined,
            diameters: selectedDiameters.length > 0 ? selectedDiameters : undefined,
          },
          changeType,
          changeAmount: amount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '미리보기 실패');
      }

      const data = await res.json();
      setPreview(data.preview);
      setStep(3);
    } catch (err) {
      setToast(err instanceof Error ? err.message : '미리보기 실패');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 일괄 적용
  const handleApply = async () => {
    if (!preview || preview.length === 0) return;
    if (!reason.trim()) {
      setToast('변경 사유를 입력해주세요.');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setApplying(true);
    try {
      const res = await csrfFetch('/api/admin/products/bulk-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: preview.map(p => ({
            product_id: p.product_id,
            price_unit_before: p.price_unit_before,
            price_unit_after: p.price_unit_after,
          })),
          changeType,
          changeAmount: parseFloat(changeAmount),
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '적용 실패');
      }

      const data = await res.json();
      setShowConfirm(false);
      setToast(`${data.updated}개 제품 가격이 변경되었습니다.`);
      setTimeout(() => setToast(''), 5000);

      // 초기화
      setPreview(null);
      setStep(1);
      setChangeAmount('');
      setReason('');
      setSelectedCategories([]);
      setSelectedColors([]);
      setSelectedDiameters([]);
    } catch (err) {
      setToast(err instanceof Error ? err.message : '적용 실패');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2c3e50', margin: 0 }}>
          일괄 가격 변경
        </h1>
        <Link href="/admin/products" style={{
          color: '#666', textDecoration: 'none', fontSize: '0.9rem',
          padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: 6,
        }}>
          제품 목록으로
        </Link>
      </div>

      {/* 스텝 인디케이터 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { num: 1, label: '조건 선택' },
          { num: 2, label: '변경 방식' },
          { num: 3, label: '미리보기 / 적용' },
        ].map(s => (
          <button key={s.num} onClick={() => { if (s.num < step || (s.num <= 2)) setStep(s.num); }}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: 8, border: 'none',
              background: step === s.num ? '#ff6b35' : step > s.num ? '#4CAF50' : '#e0e0e0',
              color: step >= s.num ? '#fff' : '#666',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}>
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: 조건 선택 */}
      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#2c3e50' }}>
            대상 제품 조건 선택
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>
            아무것도 선택하지 않으면 전체 제품이 대상이 됩니다.
          </p>

          {/* 카테고리 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>카테고리</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => toggleItem(selectedCategories, c, setSelectedCategories)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 6,
                    border: `2px solid ${selectedCategories.includes(c) ? '#ff6b35' : '#ddd'}`,
                    background: selectedCategories.includes(c) ? '#fff3ed' : '#fff',
                    color: selectedCategories.includes(c) ? '#ff6b35' : '#333',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 색상 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>색상</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => toggleItem(selectedColors, c, setSelectedColors)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 6,
                    border: `2px solid ${selectedColors.includes(c) ? '#ff6b35' : '#ddd'}`,
                    background: selectedColors.includes(c) ? '#fff3ed' : '#fff',
                    color: selectedColors.includes(c) ? '#ff6b35' : '#333',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 직경 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>직경</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {DIAMETERS.map(d => (
                <button key={d} onClick={() => toggleItem(selectedDiameters, d, setSelectedDiameters)}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: 6,
                    border: `2px solid ${selectedDiameters.includes(d) ? '#ff6b35' : '#ddd'}`,
                    background: selectedDiameters.includes(d) ? '#fff3ed' : '#fff',
                    color: selectedDiameters.includes(d) ? '#ff6b35' : '#333',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                  }}>
                  M{d}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(2)}
            style={{
              background: '#ff6b35', color: '#fff', border: 'none',
              padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
            }}>
            다음 단계
          </button>
        </div>
      )}

      {/* Step 2: 변경 방식 */}
      {step === 2 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#2c3e50' }}>
            변경 방식 설정
          </h2>

          {/* 변경 타입 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>변경 방식</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setChangeType('percent')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: 8,
                  border: `2px solid ${changeType === 'percent' ? '#ff6b35' : '#ddd'}`,
                  background: changeType === 'percent' ? '#fff3ed' : '#fff',
                  cursor: 'pointer', textAlign: 'center',
                }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: changeType === 'percent' ? '#ff6b35' : '#333' }}>
                  비율 (%)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                  예: +10 = 10% 인상
                </div>
              </button>
              <button onClick={() => setChangeType('absolute')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: 8,
                  border: `2px solid ${changeType === 'absolute' ? '#ff6b35' : '#ddd'}`,
                  background: changeType === 'absolute' ? '#fff3ed' : '#fff',
                  cursor: 'pointer', textAlign: 'center',
                }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: changeType === 'absolute' ? '#ff6b35' : '#333' }}>
                  절대값 (원)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem' }}>
                  예: +500 = 500원 인상
                </div>
              </button>
            </div>
          </div>

          {/* 변경 금액 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
              변경 {changeType === 'percent' ? '비율' : '금액'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                value={changeAmount}
                onChange={e => setChangeAmount(e.target.value)}
                placeholder={changeType === 'percent' ? '예: 10 또는 -5' : '예: 500 또는 -200'}
                style={{
                  width: 200, padding: '0.6rem', border: '2px solid #ddd',
                  borderRadius: 8, fontSize: '1rem',
                }}
              />
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {changeType === 'percent' ? '%' : '원'}
              </span>
            </div>
            {changeAmount && !isNaN(parseFloat(changeAmount)) && (
              <p style={{ fontSize: '0.85rem', color: parseFloat(changeAmount) > 0 ? '#e53935' : '#4CAF50', marginTop: '0.5rem', fontWeight: 600 }}>
                {parseFloat(changeAmount) > 0 ? '인상' : '인하'}: {changeType === 'percent' ? `${Math.abs(parseFloat(changeAmount))}%` : `${Math.abs(parseFloat(changeAmount)).toLocaleString()}원`}
              </p>
            )}
          </div>

          {/* 사유 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>변경 사유</h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="예: 원자재 가격 인상으로 인한 단가 조정"
              rows={3}
              style={{
                width: '100%', padding: '0.6rem', border: '2px solid #ddd',
                borderRadius: 8, fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setStep(1)}
              style={{
                background: '#f5f5f5', color: '#333', border: '1px solid #ddd',
                padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.9rem',
              }}>
              이전 단계
            </button>
            <button onClick={handlePreview} disabled={previewLoading}
              style={{
                background: '#ff6b35', color: '#fff', border: 'none',
                padding: '0.7rem 1.5rem', borderRadius: 8, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.9rem',
                opacity: previewLoading ? 0.7 : 1,
              }}>
              {previewLoading ? '조회 중...' : '미리보기'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 미리보기 & 적용 */}
      {step === 3 && preview && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
              미리보기 ({preview.length}개 제품)
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setStep(2)}
                style={{
                  background: '#f5f5f5', color: '#333', border: '1px solid #ddd',
                  padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                }}>
                수정
              </button>
              <button onClick={() => setShowConfirm(true)} disabled={preview.length === 0}
                style={{
                  background: '#e53935', color: '#fff', border: 'none',
                  padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                }}>
                적용 ({preview.length}개)
              </button>
            </div>
          </div>

          {/* 요약 */}
          <div style={{
            background: '#f8f9fa', borderRadius: 8, padding: '0.75rem 1rem',
            marginBottom: '1rem', fontSize: '0.85rem', color: '#333',
          }}>
            변경 방식: <strong>{changeType === 'percent' ? '비율' : '절대값'}</strong> |
            변경량: <strong style={{ color: parseFloat(changeAmount) > 0 ? '#e53935' : '#4CAF50' }}>
              {parseFloat(changeAmount) > 0 ? '+' : ''}{changeAmount}{changeType === 'percent' ? '%' : '원'}
            </strong> |
            사유: <strong>{reason || '(없음)'}</strong>
          </div>

          {/* 미리보기 테이블 */}
          <div style={{ overflowX: 'auto', maxHeight: 500, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8f9fa' }}>
                <tr>
                  <th style={thStyle2}>제품 ID</th>
                  <th style={thStyle2}>이름</th>
                  <th style={thStyle2}>카테고리</th>
                  <th style={thStyle2}>색상</th>
                  <th style={thStyle2}>직경</th>
                  <th style={{ ...thStyle2, textAlign: 'right' }}>변경 전</th>
                  <th style={{ ...thStyle2, textAlign: 'right' }}>변경 후</th>
                  <th style={{ ...thStyle2, textAlign: 'right' }}>차이</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(item => {
                  const diff = item.price_unit_after - item.price_unit_before;
                  return (
                    <tr key={item.product_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...tdStyle2, fontFamily: 'monospace', fontSize: '0.7rem' }}>{item.product_id}</td>
                      <td style={tdStyle2}>{item.name}</td>
                      <td style={tdStyle2}>{item.category}</td>
                      <td style={tdStyle2}>{item.color}</td>
                      <td style={tdStyle2}>M{item.diameter}</td>
                      <td style={{ ...tdStyle2, textAlign: 'right' }}>{item.price_unit_before.toLocaleString()}원</td>
                      <td style={{ ...tdStyle2, textAlign: 'right', fontWeight: 600 }}>{item.price_unit_after.toLocaleString()}원</td>
                      <td style={{
                        ...tdStyle2, textAlign: 'right', fontWeight: 600,
                        color: diff > 0 ? '#e53935' : diff < 0 ? '#4CAF50' : '#666',
                      }}>
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}원
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '2rem',
            maxWidth: 500, width: '90%',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e53935', marginBottom: '1rem' }}>
              일괄 가격 변경 확인
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.5rem' }}>
              <strong>{preview?.length}개</strong> 제품의 가격을 변경합니다.
            </p>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.5rem' }}>
              이 작업은 되돌릴 수 없습니다. 변경 이력은 price_history에 기록됩니다.
            </p>

            {!reason.trim() && (
              <p style={{ fontSize: '0.85rem', color: '#e53935', marginBottom: '1rem', fontWeight: 600 }}>
                변경 사유를 입력해주세요!
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)}
                style={{
                  background: '#f5f5f5', color: '#333', border: '1px solid #ddd',
                  padding: '0.6rem 1.2rem', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.9rem',
                }}>
                취소
              </button>
              <button onClick={handleApply} disabled={applying || !reason.trim()}
                style={{
                  background: '#e53935', color: '#fff', border: 'none',
                  padding: '0.6rem 1.2rem', borderRadius: 8, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.9rem',
                  opacity: (applying || !reason.trim()) ? 0.5 : 1,
                }}>
                {applying ? '적용 중...' : '적용 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', padding: '0.85rem 1.5rem',
          borderRadius: 10, fontSize: '0.9rem', zIndex: 4000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const thStyle2: React.CSSProperties = {
  padding: '0.5rem 0.6rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#666',
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
};

const tdStyle2: React.CSSProperties = {
  padding: '0.4rem 0.6rem',
  color: '#333',
  whiteSpace: 'nowrap',
};
