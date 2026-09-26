import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CaiDatPet } from './CaiDatPet';

beforeEach(() => localStorage.clear());

describe('Cài đặt → Pet MIMI', () => {
  it('mặc định tắt; bật thì lưu và báo cho pet; tắt lại được', () => {
    let suKien: unknown = null;
    window.addEventListener('mimi:lenh-pet', (e) => { suKien = (e as CustomEvent).detail; }, { once: true });
    render(<CaiDatPet />);
    const cong = screen.getByRole('switch', { name: 'Hiện pet MIMI' });
    expect(cong.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(cong);
    expect(cong.getAttribute('aria-checked')).toBe('true');
    expect(JSON.parse(localStorage.getItem('mimi.pet.v2') as string).an).toBe(false);
    expect(suKien).toEqual({ an: false });
    fireEvent.click(cong);
    expect(JSON.parse(localStorage.getItem('mimi.pet.v2') as string).an).toBe(true);
  });
});
