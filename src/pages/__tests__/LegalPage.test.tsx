import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';
import { PrivacyPage, TermsPage } from '../LegalPage';

function renderWithProviders(node: React.ReactElement) {
  return render(
    <HelmetProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </HelmetProvider>,
  );
}

describe('Privacy Page — regulator-facing disclosures', () => {
  it('exposes every numbered section heading the operator promised', () => {
    renderWithProviders(<PrivacyPage />);
    const expectedHeadings = [
      /1\. What We Collect From End Users/i,
      /2\. Room Visibility/i,
      /3\. Retention/i,
      /4\. Sponsor Click Tracking/i,
      /5\. Anonymous Site Analytics/i,
      /6\. What We Don't Do/i,
      /7\. Sharing With Infrastructure Providers/i,
      /8\. Security/i,
      /9\. Your Rights/i,
      /10\. Children/i,
      /11\. Changes/i,
      /12\. Contact/i,
    ];
    for (const heading of expectedHeadings) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });

  it('spells out the rotating-salt analytics model in plain language', () => {
    renderWithProviders(<PrivacyPage />);
    // These phrases are the load-bearing legal claims — if any change without
    // a corresponding code update, the disclosure could become inaccurate.
    expect(screen.getByText(/cryptographic salt that rotates every 24 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/no cookies, no advertising trackers/i)).toBeInTheDocument();
    expect(screen.getByText(/no third-party analytics scripts/i)).toBeInTheDocument();
  });
});

describe('Terms Page — surface check', () => {
  it('renders without crashing and shows the document title', () => {
    renderWithProviders(<TermsPage />);
    expect(screen.getByText(/TERMS OF SERVICE/i)).toBeInTheDocument();
  });
});
