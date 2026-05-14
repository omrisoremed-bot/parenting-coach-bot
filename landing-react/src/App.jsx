/**
 * ParentAtEase — Landing page (no blog — blog isolated to blog.parentatease.com)
 *
 * Sections : Nav · Hero · Ticker · HowItWorks · Features · Authors
 *          · Games · Testimonials · Pricing · FAQ · CTA · Footer
 */
import Nav          from './components/Nav.jsx';
import Hero         from './components/Hero.jsx';
import Ticker       from './components/Ticker.jsx';
import HowItWorks   from './components/HowItWorks.jsx';
import Features     from './components/Features.jsx';
import Authors      from './components/Authors.jsx';
import Games        from './components/Games.jsx';
import Testimonials from './components/Testimonials.jsx';
import Pricing      from './components/Pricing.jsx';
import FAQ          from './components/FAQ.jsx';
import CTA          from './components/CTA.jsx';
import Footer       from './components/Footer.jsx';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <HowItWorks />
        <Features />
        <Authors />
        <Games />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
