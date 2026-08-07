import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for tours, services, and travel products booked with Discover Albania.",
  alternates: { canonical: "/terms-and-conditions" },
};

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[#e5ecee] pt-8 first:border-0 first:pt-0">
      <h2 className="font-display text-2xl font-black tracking-[-0.025em] text-brand-navy">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-foreground/80">{children}</div>
    </section>
  );
}

const listClassName = "ml-5 list-disc space-y-1.5 marker:text-teal";

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-[#f4f7f8] px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2.5rem] bg-brand-deep px-6 py-12 text-white shadow-[0_28px_70px_rgba(5,29,34,0.2)] sm:px-10 sm:py-16 lg:px-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Legal information</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
            These Terms apply to all tours, services, and travel products booked through our website, by email, or directly at our physical office.
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <article className="space-y-10 rounded-[2rem] border border-[#e1e9ec] bg-white p-6 shadow-[0_16px_45px_rgba(7,52,60,0.08)] sm:p-10">
            <div className="space-y-4 text-[15px] leading-7 text-foreground/80">
              <p>
                By confirming a booking with Discover Albania, you (“Client”, “Customer”, “You”) agree to the following Terms, which constitute a legally binding agreement between you and:
              </p>
              <div className="rounded-[1.5rem] bg-teal-soft p-5 text-brand-navy">
                <p className="font-bold">Albania Social Club</p>
                <p>Operating under the commercial brand: Discover Albania</p>
                <p>NIPT/NUIS: L52401017I</p>
                <p>Tour Operator License No: LN-4469-02-2018</p>
                <p className="mt-2">(“We”, “Us”, “Our”, “Company”)</p>
              </div>
              <p className="font-semibold text-brand-navy">Please read these Terms carefully before confirming your reservation.</p>
            </div>

            <TermsSection title="1. General Information">
              <p>Albania Social Club (Discover Albania) operates as a licensed tour operator and travel design service in Albania.</p>
              <p>All bookings (website, email, or in person) are subject to availability and written confirmation.</p>
              <p>By making a booking, you confirm that you are at least 18 years old and legally capable of entering into a binding agreement.</p>
              <p>A contract is considered legally binding once written confirmation is issued and the required deposit or payment is received.</p>
            </TermsSection>

            <TermsSection title="2. Reservations & Payments">
              <h3 className="font-bold text-brand-navy">2.1 Making a Reservation</h3>
              <p>A reservation is considered requested when:</p>
              <ul className={listClassName}>
                <li>You submit a booking form via the Website, OR</li>
                <li>You confirm a booking by email, OR</li>
                <li>You confirm a booking in person at our office.</li>
              </ul>
              <p>A reservation becomes confirmed only when:</p>
              <ul className={listClassName}>
                <li>You receive written confirmation from Discover Albania (email or signed document), AND</li>
                <li>The required deposit or full payment has been successfully received.</li>
              </ul>
              <p>You are responsible for ensuring that all personal information provided is accurate.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.2 Deposit Requirements</h3>
              <p>To secure your spot on a tour, the following non refundable deposits apply:</p>
              <ul className={listClassName}>
                <li>Day tours (1 day): No deposit OR full payment at booking (depending on tour type)</li>
                <li>Multi day tours (2+ days): 20% to 30% deposit</li>
                <li>Private/custom tours: 30% deposit</li>
                <li>Peak season (July to August, holidays): Up to 50% deposit</li>
              </ul>
              <p>The exact deposit amount will be clearly stated in your offer, proforma invoice, or confirmation email.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.3 Final Payment Deadlines</h3>
              <p>Final payments must be made as follows:</p>
              <ul className={listClassName}>
                <li>Tours up to 5 days: Final payment due 14 days before departure</li>
                <li>Tours of 6+ days: Final payment due 30 days before departure</li>
                <li>Private/custom itineraries: Final payment due 30 days before departure (unless otherwise stated)</li>
              </ul>
              <p>For last minute bookings made after the deadline, the full amount is due immediately.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.4 Failure to Pay</h3>
              <p>If full payment is not received by the deadline:</p>
              <ul className={listClassName}>
                <li>A reminder notice will be sent via email or phone.</li>
                <li>If no payment is received within 48 hours after the reminder, Discover Albania may cancel your reservation and retain the deposit as a cancellation fee.</li>
              </ul>
              <p>This follows standard international travel industry practices.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.5 Payment Methods</h3>
              <p>We accept the following payment methods:</p>
              <ul className={listClassName}>
                <li>Credit/debit cards</li>
                <li>Bank transfer</li>
                <li>Cash (for bookings made in the office or locally at the last minute, when explicitly permitted)</li>
              </ul>
              <p>All bank transfer fees and currency conversion costs must be covered by the client.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.6 Price Validity & Potential Changes</h3>
              <p>Prices are valid at the time the offer is issued.</p>
              <p>Once your booking is confirmed, the agreed price will not change, except in cases of:</p>
              <ul className={listClassName}>
                <li>Significant changes in external provider costs</li>
                <li>Government tax increases</li>
                <li>Official fee adjustments</li>
              </ul>
              <p>If a necessary price adjustment exceeds +10%, you may choose between:</p>
              <ul className={listClassName}>
                <li>Accepting the updated price</li>
                <li>Canceling with a full refund of amounts paid</li>
              </ul>

              <h3 className="pt-3 font-bold text-brand-navy">2.7 What Your Payment Includes</h3>
              <p>Inclusions depend on the specific tour and are listed in your confirmed itinerary. May include:</p>
              <ul className={listClassName}>
                <li>Accommodation</li>
                <li>Transportation</li>
                <li>Guided services</li>
                <li>Mentioned activities</li>
                <li>Meals if specified</li>
                <li>VAT and service charges</li>
              </ul>
              <p>Unless explicitly stated, the following are not included:</p>
              <ul className={listClassName}>
                <li>International flights</li>
                <li>Personal expenses</li>
                <li>Travel insurance</li>
                <li>Optional excursions</li>
                <li>Meals not specified</li>
                <li>Tips and gratuities</li>
              </ul>

              <h3 className="pt-3 font-bold text-brand-navy">2.8 Voucher & Confirmation</h3>
              <p>After full payment, you will receive:</p>
              <ul className={listClassName}>
                <li>A detailed Booking Confirmation</li>
                <li>A Tour Voucher including the meeting point, start time, local contact details, and emergency number</li>
              </ul>
              <p>The voucher (digital or printed) must be presented at the start of the tour.</p>

              <h3 className="pt-3 font-bold text-brand-navy">2.9 Group Size & Minimum Numbers</h3>
              <p>Some tours require a minimum number of participants. If this minimum is not reached, Discover Albania may:</p>
              <ul className={listClassName}>
                <li>Offer an alternative date</li>
                <li>Offer an alternative tour</li>
                <li>Issue a full refund</li>
              </ul>
              <p>No further compensation is provided.</p>
            </TermsSection>

            <TermsSection title="3. Cancellation Policy">
              <h3 className="font-bold text-brand-navy">3.1 Cancellation by the Client</h3>
              <p>All cancellations must be communicated in writing (email or signed request).</p>
              <p>Unless otherwise stated in your contract:</p>
              <ul className={listClassName}>
                <li>More than 14 days before departure: Full refund minus deposit</li>
                <li>7 to 14 days before departure: 50% refund</li>
                <li>Less than 7 days before departure or no show: No refund</li>
              </ul>
              <h3 className="pt-3 font-bold text-brand-navy">3.2 Cancellation by Discover Albania</h3>
              <p>We may cancel a trip due to:</p>
              <ul className={listClassName}>
                <li>Insufficient participant numbers</li>
                <li>Severe weather</li>
                <li>Safety concerns</li>
                <li>Force majeure</li>
                <li>Unexpected circumstances beyond our control</li>
              </ul>
              <p>In such cases, you may choose between:</p>
              <ul className={listClassName}>
                <li>Full refund</li>
                <li>Rescheduling</li>
                <li>Credit for a future tour</li>
              </ul>
              <p>We are not responsible for external travel costs such as flights or hotels booked independently.</p>
            </TermsSection>

            <TermsSection title="4. Amendments & Client Changes">
              <p>Changes requested by the client are subject to availability.</p>
              <p>Administrative or supplier fees may apply.</p>
              <p>Changes requested within 7 days of departure may not be possible.</p>
            </TermsSection>

            <TermsSection title="5. Client Responsibilities">
              <p>You agree to:</p>
              <ul className={listClassName}>
                <li>Follow instructions from Discover Albania staff and guides</li>
                <li>Arrive on time</li>
                <li>Behave respectfully toward other travelers and local communities</li>
                <li>Ensure you meet physical requirements for the activity</li>
              </ul>
              <p>Failure to comply may result in removal from the tour without refund.</p>
            </TermsSection>

            <TermsSection title="6. Travel Documents & Insurance">
              <p>Clients must possess valid travel documents (passport, ID, visas if required).</p>
              <p>Travel insurance is strongly recommended and may be mandatory for certain activities.</p>
              <p>Discover Albania is not responsible for travel delays or issues arising from missing or incorrect documents.</p>
            </TermsSection>

            <TermsSection title="7. Health, Safety & Risk">
              <p>Certain activities involve inherent risks.</p>
              <p>By participating, you acknowledge and accept these risks.</p>
              <p>Discover Albania is not liable for injuries, loss, or illness unless caused by proven negligence under Albanian law.</p>
            </TermsSection>

            <TermsSection title="8. Force Majeure">
              <p>We are not liable for disruptions caused by events beyond our reasonable control, including but not limited to:</p>
              <ul className={listClassName}>
                <li>Natural disasters</li>
                <li>Political unrest</li>
                <li>Pandemics</li>
                <li>Strikes</li>
                <li>Transport disruptions</li>
              </ul>
              <p>Refunds, credits, or rescheduling will follow our standard policy or any applicable legal directives.</p>
            </TermsSection>

            <TermsSection title="9. Limitation of Liability">
              <p>Discover Albania / Albania Social Club is not responsible for:</p>
              <ul className={listClassName}>
                <li>Loss or damage to personal belongings</li>
                <li>Theft</li>
                <li>Acts or omissions of external service providers</li>
                <li>Additional costs caused by delays or cancellations beyond our control</li>
              </ul>
              <p>Our total liability is limited to the total amount paid by the client for the booking.</p>
            </TermsSection>

            <TermsSection title="10. Intellectual Property">
              <p>All content, itineraries, branding, and materials provided by Discover Albania remain the intellectual property of Albania Social Club and may not be copied, reproduced, or distributed without written permission.</p>
            </TermsSection>

            <TermsSection title="11. Privacy & Data Protection">
              <p>We collect only the information necessary to process your booking and operate the tour. Your data is never sold or shared beyond necessary service providers.</p>
            </TermsSection>

            <TermsSection title="12. Governing Law">
              <p>These Terms are governed by the laws of the Republic of Albania. Any disputes shall be settled exclusively in the competent courts of Tirana, Albania.</p>
            </TermsSection>

            <TermsSection title="13. Company Details & Contact Information">
              <p className="font-bold text-brand-navy">Albania Social Club</p>
              <p>Commercial Brand: Discover Albania</p>
              <p>NIPT/NUIS: L52401017I</p>
              <p>Tour Operator License: LN-4469-02-2018</p>
              <p>Address: Rr. Myslym Shyri, P.24, Sh 1/4, Tirana, Albania</p>
              <p>Email: <a className="font-semibold text-teal underline-offset-4 hover:underline" href="mailto:info@discoveralbania.al">info@discoveralbania.al</a></p>
              <p>Phone: <a className="font-semibold text-teal underline-offset-4 hover:underline" href="tel:+355696583870">+355 69 658 3870</a></p>
              <p>Website: <a className="font-semibold text-teal underline-offset-4 hover:underline" href="https://discoveralbania.al/" target="_blank" rel="noopener noreferrer">discoveralbania.al</a></p>
            </TermsSection>
          </article>

          <aside className="rounded-[2rem] border border-[#dce7e9] bg-white p-6 shadow-[0_14px_38px_rgba(7,52,60,0.08)] lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">Company details</p>
            <dl className="mt-5 space-y-4 text-sm leading-6">
              <div>
                <dt className="text-xs font-semibold text-muted">Legal entity</dt>
                <dd className="mt-1 font-bold text-brand-navy">Albania Social Club</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Commercial brand</dt>
                <dd className="mt-1 font-bold text-brand-navy">Discover Albania</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">NIPT/NUIS</dt>
                <dd className="mt-1 font-mono text-brand-navy">L52401017I</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Tour Operator License</dt>
                <dd className="mt-1 font-mono text-brand-navy">LN-4469-02-2018</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </div>
  );
}
