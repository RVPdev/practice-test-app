import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { LegalDocument } from './LegalDocument';

afterEach(() => {
  cleanup();
});

describe('LegalDocument', () => {
  it('renders the title, last-updated date, and every section', async () => {
    await render(
      <LegalDocument
        title="Terms of Service"
        updated="September 12, 2026"
        sections={[
          { heading: 'First Section', paragraphs: ['First paragraph.', 'Second paragraph.'] },
          { heading: 'Second Section', paragraphs: ['Another paragraph.'] },
        ]}
      />,
    );

    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Last updated: September 12, 2026')).toBeTruthy();
    expect(screen.getByText('First Section')).toBeTruthy();
    expect(screen.getByText('First paragraph.')).toBeTruthy();
    expect(screen.getByText('Second paragraph.')).toBeTruthy();
    expect(screen.getByText('Second Section')).toBeTruthy();
    expect(screen.getByText('Another paragraph.')).toBeTruthy();
  });
});
