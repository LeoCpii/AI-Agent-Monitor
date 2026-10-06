import { expect, test } from 'vitest';

import { render, screen } from '@testing-library/react';

import './setup';

test('renders a dashboard test element', () => {
  render(<div>AI Monitor</div>);

  expect(screen.getByText('AI Monitor')).toBeVisible();
});
