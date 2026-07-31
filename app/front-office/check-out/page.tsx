'use client';

import FrontOfficeTabs from '@/components/front-office/FrontOfficeTabs';
import CheckOutPanel from '@/components/front-office/CheckOutPanel';

export default function FrontOfficeCheckOutPage() {
  return (
    <section className="pms-section">
      <div className="section-header">
        <h2 className="section-title">Front Office</h2>
      </div>

      <FrontOfficeTabs />

      <div className="fo-panel">
        <CheckOutPanel />
      </div>
    </section>
  );
}
