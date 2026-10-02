import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { MeoSong } from './MeoSong';

/** Mèo sống trong biểu tượng nhỏ (29/09/2026): rê qua lại trên đầu là được xoa đầu. */
describe('mèo trong logo', () => {
  it('rê qua lại trên đầu → vui; rê một chiều thì không', () => {
    const { container } = render(<MeoSong />);
    const meo = container.firstElementChild as HTMLElement;
    // jsdom chưa có PointerEvent: phát MouseEvent mang tên pointermove để có clientX.
    const re = (x: number) => act(() => { meo.dispatchEvent(new MouseEvent('pointermove', { clientX: x, bubbles: true })); });
    expect(meo.dataset.dang).toBe('thuc');
    for (const x of [10, 20, 30, 40]) re(x);
    expect(meo.dataset.dang).toBe('thuc');
    for (const x of [30, 20, 30, 20]) re(x);
    expect(meo.dataset.dang).toBe('vui');
  });
});
