import { beforeEach, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Leadership } from '../company-leadership';
const state = vi.hoisted(() => ({ data: null as Leadership | null }));
vi.mock('swr', () => ({ default: () => ({ data: state.data, error: null, isLoading: false }) }));
vi.mock('@/components/layout/page-header', () => ({ Panel: ({children}: {children: ReactNode}) => createElement('section', null, children) }));
import { LeadershipPanel } from '@/components/research/leadership-panel';
beforeEach(() => {
  state.data = {symbol:'ACME',company:null,checkedAt:'2026-10-07',people:[],dividends:null,holdings:null,annualReportUrl:null,notes:[],pay:{symbol:'ACME',fy:'FY26',filingDate:'2026-06-01',updatedAt:'2026-10-07',extractedBy:'rules',status:'ok',reason:null,sourceUrl:'https://nsearchives.nseindia.com/corporate/pay.pdf',ratios:[],rows:[{category:'Board of Directors',maleCount:2,maleMedian:200,femaleCount:null,femaleMedian:null},{category:'Employees (non-board, non-KMP)',maleCount:10,maleMedian:100,femaleCount:5,femaleMedian:80}]}};
});
const render = () => renderToStaticMarkup(createElement(LeadershipPanel,{symbol:'ACME'}));
it('shows the FY, filing date and source, preserving unknown counts', () => {
  const html=render();expect(html).toContain('filed 2026-06-01');expect(html).toContain('FY26');expect(html).toContain('female not reported');expect(html).toContain('href="https://nsearchives.nseindia.com/corporate/pay.pdf"');
});
it('shows clear source-linked unavailability without numeric pay bars', () => {
  state.data!.pay!.status='unreadable';state.data!.pay!.reason='PDF page limit reached';
  const html=render();expect(html).toContain('could not be read');expect(html).not.toContain('male 2');expect(html).toContain('pay.pdf');expect(html).not.toContain('vs employee median');
});
it('labels older-year fallback and model extraction with the newer filing link', () => {
  state.data!.pay!.fy='FY25';state.data!.pay!.extractedBy='model';state.data!.pay!.latestAttempt={fy:'FY26',status:'dead_link',reason:'HTTP 404',sourceUrl:'https://nsearchives.nseindia.com/corporate/new.pdf'};
  const html=render();expect(html).toContain('Showing FY25');expect(html).toContain('newer FY26');expect(html).toContain('machine-read');expect(html).toContain('new.pdf');
});
