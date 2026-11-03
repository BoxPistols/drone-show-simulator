import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DronePicker } from './DronePicker';

function renderPicker(over: Partial<React.ComponentProps<typeof DronePicker>> = {}) {
  const props = {
    povIndex: -1,
    pips: [] as number[],
    maxPips: 4,
    pipNotice: null,
    onRide: vi.fn(),
    onAddPip: vi.fn(),
    onRemovePip: vi.fn(),
    onPromotePip: vi.fn(),
    ...over,
  };
  return { ...render(<DronePicker {...props} />), props };
}

describe('<DronePicker>', () => {
  it('rides the typed drone on Enter', async () => {
    const { props } = renderPicker();
    await userEvent.type(screen.getByLabelText('機体を指定'), 'as-42{Enter}');
    expect(props.onRide).toHaveBeenCalledWith(41);
  });

  it('shows an error and does not ride for an unknown id', async () => {
    const { props } = renderPicker();
    const input = screen.getByLabelText('機体を指定');
    await userEvent.type(input, 'AS-999{Enter}');
    expect(props.onRide).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/AS-001〜AS-660/);
  });

  it('steps the id with the arrow keys, starting from the current drone', async () => {
    renderPicker({ povIndex: 9 });
    const input = screen.getByLabelText('機体を指定');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveValue('AS-011');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveValue('AS-009');
  });

  it('adds a PiP and disables the button at the limit or in lite mode', async () => {
    const { props, rerender } = renderPicker();
    await userEvent.type(screen.getByLabelText('機体を指定'), '7');
    await userEvent.click(screen.getByRole('button', { name: '小窓に追加' }));
    expect(props.onAddPip).toHaveBeenCalledWith(6);

    rerender(<DronePicker {...props} pips={[0, 1]} maxPips={2} />);
    expect(screen.getByRole('button', { name: '小窓に追加' })).toBeDisabled();
    rerender(
      <DronePicker {...props} maxPips={0} pipNotice="軽量モードのため小窓は表示していません" />
    );
    expect(screen.getByRole('button', { name: '小窓に追加' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('軽量モード');
  });

  it('lists PiPs with promote and close actions', async () => {
    const { props } = renderPicker({ pips: [4, 99] });
    const list = screen.getByRole('list', { name: '小窓で見ている機体' });
    expect(list).toHaveTextContent('AS-005');
    expect(list).toHaveTextContent('AS-100');
    await userEvent.click(screen.getByRole('button', { name: 'AS-100 をメインの視点にする' }));
    expect(props.onPromotePip).toHaveBeenCalledWith(99);
    await userEvent.click(screen.getByRole('button', { name: 'AS-005 の小窓を閉じる' }));
    expect(props.onRemovePip).toHaveBeenCalledWith(4);
  });
});
