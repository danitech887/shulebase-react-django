/**
 * Home — School Management System
 * React + React-Bootstrap component-based implementation
 *
 * Dependencies:
 *   npm install react-bootstrap bootstrap
 *
 * In your index.js / main.jsx, add:
 *   import 'bootstrap/dist/css/bootstrap.min.css';
 *   import './Home.css';
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Row, Col, Nav, Navbar, Button,
  Modal, Form, Tab, Tabs,
} from 'react-bootstrap';
import './Home.css';

import RegisterSchool from '../School/RegisterSchool';
import Login from '../Login/Login';
import logo from '/assets/images/logo.png';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// DATA CONSTANTS
// ─────────────────────────────────────────────

const FEATURES = [
  {
    icon: '👨‍🎓', iconClass: 'fi-teal', title: 'Student Management',
    desc: 'Complete student lifecycle management — admissions, enrollment, class allocation, promotions, transfers, and alumni records. Maintain comprehensive student profiles with photos and documents.',
    tags: ['Admissions', 'Profiles', 'Transfers', 'Alumni'],
  },
  {
    icon: '💰', iconClass: 'fi-gold', title: 'Fee Management & Billing',
    desc: 'Automate fee invoicing, track payments, send reminders, and generate receipts. Integrates with M-Pesa and bank transfers. Detailed financial reports at your fingertips anytime.',
    tags: ['M-Pesa', 'Invoices', 'Reminders', 'Reports'],
  },
  {
    icon: '📝', iconClass: 'fi-sky', title: 'Academics & Exams',
    desc: 'Manage timetables, lesson planning, continuous assessment tests (CATs), mid-terms, and end-of-term exams. Auto-generate report cards and transcript documents with customizable templates.',
    tags: ['Timetables', 'Exams', 'Report Cards', 'GPA'],
  },
  {
    icon: '📅', iconClass: 'fi-pink', title: 'Attendance Tracking',
    desc: 'Daily student and staff attendance with biometric support, SMS alerts to parents for absences, detailed attendance analytics, and automated follow-up workflows to reduce absenteeism.',
    tags: ['Biometric', 'SMS Alerts', 'Analytics'],
  },
  {
    icon: '👩‍🏫', iconClass: 'fi-purple', title: 'Staff & HR Management',
    desc: 'Staff profiles, payroll processing, leave management, performance appraisals, and document management. Streamline your HR operations and ensure compliance with labour regulations.',
    tags: ['Payroll', 'Leave', 'Appraisals', 'Documents'],
  },
  {
    icon: '📱', iconClass: 'fi-orange', title: 'Parent & Communication Portal',
    desc: 'Real-time SMS and email notifications, parent portal for fee status and results, internal messaging between teachers and parents, and school-wide announcements with read receipts.',
    tags: ['SMS', 'Email', 'Portal', 'Announcements'],
  },
  {
    icon: '📦', iconClass: 'fi-teal', title: 'Inventory & Library',
    desc: 'Track school assets, textbooks, lab equipment, and library resources. Manage book borrowing records, stock levels, procurement requests, and generate asset depreciation reports.',
    tags: ['Library', 'Assets', 'Procurement'],
  },
  {
    icon: '🚌', iconClass: 'fi-gold', title: 'Transport Management',
    desc: 'Manage school buses, routes, driver profiles, and student transport assignments. GPS tracking integration available. Automatically notify parents when the bus is near their stop.',
    tags: ['Routes', 'GPS', 'Notifications'],
  },
  {
    icon: '📊', iconClass: 'fi-sky', title: 'Analytics & Reporting',
    desc: 'Comprehensive dashboards with real-time KPIs. Generate custom reports on academics, finance, attendance, and more. Export to PDF or Excel for board meetings and government submissions.',
    tags: ['Dashboard', 'Export', 'KPIs', 'Custom Reports'],
  },
];

const STEPS = [
  { num: 1, title: 'Register Your School', desc: 'Create your free account. Enter your school details — name, type, location, and logo. Takes under 5 minutes.' },
  { num: 2, title: 'Configure & Customize', desc: 'Set up classes, subjects, fee structures, grading scales, and academic calendar to match your school\'s needs.' },
  { num: 3, title: 'Import Your Data', desc: 'Bulk-import student and staff records via Excel. Our team helps with data migration at no extra cost.' },
  { num: 4, title: 'Go Live & Grow', desc: 'Invite staff and parents. Start managing your school smarter from day one with full support from our team.' },
];

const PRICING_MONTHLY = [3500, 7500, 14000];
const PRICING_ANNUAL  = [2800, 6000, 11200];

const PRICING_PLANS = [
  {
    tier: 'Starter', descShort: 'Perfect for small schools and primary schools just getting started with digital management.',
    features: [
      { ok: true,  text: 'Up to 300 students' },
      { ok: true,  text: 'Student & staff management' },
      { ok: true,  text: 'Basic fee management' },
      { ok: true,  text: 'Exam & report card management' },
      { ok: true,  text: 'Attendance tracking' },
      { ok: false, text: 'M-Pesa Integration' },
      { ok: false, text: 'SMS notifications' },
      { ok: true,  text: 'Email support' },
      { ok: false, text: 'Staff payroll module' },
      { ok: false, text: 'Transport management' },
    ],
    btnClass: 'price-btn price-btn-outline', btnLabel: 'Start Free Trial', action: 'register',
    popular: false,
  },
  {
    tier: 'Growth', descShort: 'The ideal all-rounder for growing secondary schools that need the full feature set.',
    features: [
      { ok: true,  text: 'Up to 1,000 students' },
      { ok: true,  text: 'Everything in Starter' },
      { ok: true,  text: 'One Integration (SMS or M-Pesa)' },
      { ok: true,  text: 'Staff payroll & HR module' },
      { ok: true,  text: 'Parent portal & mobile app' },
      { ok: true,  text: 'Library management' },
      { ok: true,  text: 'Inventory & asset tracking' },
      { ok: true,  text: 'Advanced analytics dashboard' },
      { ok: true,  text: 'Priority phone support' },
      { ok: false, text: 'Transport management' },
    ],
    btnClass: 'price-btn price-btn-filled', btnLabel: 'Get Started Now', action: 'register',
    popular: true,
  },
  {
    tier: 'Enterprise', descShort: 'For large schools, school chains, and institutions needing unlimited capacity and custom features.',
    features: [
      { ok: true, text: 'Unlimited students' },
      { ok: true, text: 'Everything in Growth' },
      { ok: true, text: 'Full SMS & M-Pesa Integration' },
      { ok: true, text: 'Transport & GPS management' },
      { ok: true, text: 'Multi-campus / branch support' },
      { ok: true, text: 'Custom branding & domain' },
      { ok: true, text: 'API access & integrations' },
      { ok: true, text: 'Dedicated account manager' },
      { ok: true, text: 'On-site training & setup' },
      { ok: true, text: 'SLA & 24/7 support' },
    ],
    btnClass: 'price-btn price-btn-dark', btnLabel: 'Contact Sales', action: 'contact',
    popular: false,
  },
];

// ─────────────────────────────────────────────
// SCROLL REVEAL HOOK
// ─────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─────────────────────────────────────────────
// NAVBAR COMPONENT
// ─────────────────────────────────────────────
function SBNavbar({ onOpenModal }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    // Run once on mount so initial state is correct
    handler();
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Navbar
      expand="lg"
      className={`sb-navbar sb-navbar--always-visible ${scrolled ? 'scrolled' : ''}`}
      id="navbar"
    >
      <Container fluid style={{ maxWidth: 1180, padding: '0 24px' }}>
        <Navbar.Brand href="#hero" className="d-flex align-items-center">
          <img src={logo} alt="ShuleBase" className="sb-logo-img" />
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="sb-nav-collapse" />

        <Navbar.Collapse id="sb-nav-collapse">
          <Nav className="mx-auto gap-lg-4">
            {[
              { id: 'about',    label: 'About' },
              { id: 'features', label: 'Features' },
              { id: 'how',      label: 'How It Works' },
              { id: 'reviews',  label: 'Reviews' },
              { id: 'contact',  label: 'Contact' },
            ].map((s) => (
              <Nav.Link key={s.id} onClick={() => scrollTo(s.id)}>
                {s.label}
              </Nav.Link>
            ))}
          </Nav>
          <div className="d-flex gap-2 mt-3 mt-lg-0">
            <button className="btn-nav-login" onClick={() => onOpenModal('login')}>Log In</button>
            <button className="btn-nav-cta" onClick={() => onOpenModal('register')}>Get Started Free</button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

// ─────────────────────────────────────────────
// HERO COMPONENT
// ─────────────────────────────────────────────
function HeroSection({ onOpenModal }) {
  return (
    <section id="hero">
      <div className="hero-bg">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-grid" />
      </div>

      <div className="hero-content w-100">
        <Container style={{ maxWidth: 1180 }}>
          <Row className="align-items-center g-5">
            {/* Left */}
            <Col lg={6}>
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                <span>🏫 Trusted by 500+ Schools in Kenya</span>
              </div>
              <h1 className="hero-title">
                The <span className="accent">Smartest</span> School Management Platform for{' '}
                <span className="gold">Modern Schools</span>
              </h1>
              <p className="hero-desc">
                ShuleBase brings all your school operations into one powerful, easy-to-use platform
                — from admissions and academics to finance, communication, and beyond.
              </p>
              <div className="hero-btns">
                <button className="btn-primary-sb" onClick={() => onOpenModal('register')}>
                  🚀 Start Free Trial
                </button>
                <button
                  className="btn-outline-sb"
                  onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Watch Demo ▶
                </button>
              </div>
              <div className="hero-stats">
                {[
                  { num: '500', sup: '+', label: 'Schools Onboarded' },
                  { num: '120K', sup: '+', label: 'Students Managed' },
                  { num: '99', sup: '%', label: 'Uptime Guarantee' },
                  { num: '24/7', sup: '', label: 'Support Available' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="stat-num">{s.num}<span>{s.sup}</span></div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </Col>

            {/* Right — Dashboard Card */}
            <Col lg={6} className="d-none d-lg-block">
              <div style={{ position: 'relative' }}>
                <div className="hero-card">
                  <div className="hero-card-title">📊 School Dashboard — St. Mary's Academy</div>
                  <div className="dashboard-row">
                    <div className="dash-tile">
                      <div className="dash-tile-icon">👨‍🎓</div>
                      <div className="dash-tile-val">1,248</div>
                      <div className="dash-tile-lbl">Total Students</div>
                    </div>
                    <div className="dash-tile">
                      <div className="dash-tile-icon">👩‍🏫</div>
                      <div className="dash-tile-val">86</div>
                      <div className="dash-tile-lbl">Teaching Staff</div>
                    </div>
                  </div>
                  <div className="dashboard-row">
                    <div className="dash-tile">
                      <div className="dash-tile-icon">💰</div>
                      <div className="dash-tile-val">KES 2.4M</div>
                      <div className="dash-tile-lbl">Fees This Term</div>
                    </div>
                    <div className="dash-tile">
                      <div className="dash-tile-icon">📋</div>
                      <div className="dash-tile-val">94%</div>
                      <div className="dash-tile-lbl">Attendance Rate</div>
                    </div>
                  </div>
                  <div className="hero-bar-section">
                    {[
                      { label: 'Fee Collection Progress', pct: 78, grad: 'linear-gradient(90deg,#00C9A7,#4FA3E0)' },
                      { label: 'Academic Performance',    pct: 85, grad: 'linear-gradient(90deg,#FFB800,#FF8C00)' },
                      { label: 'Parent Engagement',       pct: 62, grad: 'linear-gradient(90deg,#4FA3E0,#6C63FF)' },
                    ].map((b) => (
                      <div key={b.label}>
                        <div className="bar-label"><span>{b.label}</span><span>{b.pct}%</span></div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${b.pct}%`, background: b.grad }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="float-badge float-badge-1">
                  <div className="fb-icon" style={{ background: 'rgba(0,201,167,.1)' }}>✅</div>
                  <div>
                    <div className="fb-text">Fee Payment Received</div>
                    <div className="fb-sub">Form 3B — 12 students · just now</div>
                  </div>
                </div>
                <div className="float-badge float-badge-2">
                  <div className="fb-icon" style={{ background: 'rgba(255,184,0,.1)' }}>📝</div>
                  <div>
                    <div className="fb-text">Exam Results Published</div>
                    <div className="fb-sub">Term 2 · All classes ready</div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// TRUSTED BY
// ─────────────────────────────────────────────
function TrustedSection({ schools }) {
  if (!schools?.length) return null;
  return (
    <section id="trusted">
      <Container style={{ maxWidth: 1180 }}>
        <p className="trusted-label">Trusted by leading schools across Kenya</p>
        <div className="schools-list">
          {schools.map((s) => (
            <div key={s.id} className="school-pill">
               {s.logo_path ? <img src={`${BASE_URL}${s.logo_path}`} alt="" className="pill-logo" /> : "🏫"} {s.school_name}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// ABOUT
// ─────────────────────────────────────────────
function AboutSection() {
  return (
    <section id="about">
      <Container style={{ maxWidth: 1180 }}>
        <Row className="align-items-center g-5">
          {/* Visual */}
          <Col lg={6} className="reveal">
            <div className="about-main-card">
              <div className="about-icon-row">
                <div className="a-icon a-icon-teal">🏫</div>
                <div className="a-icon a-icon-gold">📊</div>
                <div className="a-icon a-icon-sky">🔗</div>
              </div>
              <h3 style={{ color: 'white', fontSize: 22, marginBottom: 10 }}>
                One Platform. Every School Need.
              </h3>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, lineHeight: 1.7 }}>
                ShuleBase integrates every critical school function into a single, cloud-based
                platform. No more juggling multiple systems or paper records — everything is
                connected, real-time, and accessible anywhere.
              </p>
              <div className="about-card-stat">
                {[
                  { val: '500+', lbl: 'Active Schools' },
                  { val: '120K+', lbl: 'Students Managed' },
                  { val: '99.9%', lbl: 'System Uptime' },
                  { val: '4.9★', lbl: 'Average Rating' },
                ].map((i) => (
                  <div key={i.lbl} className="acs-item">
                    <div className="acs-val">{i.val}</div>
                    <div className="acs-lbl">{i.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-small-card">
              <div className="asc-head">✨ What Makes Us Different</div>
              <div className="asc-list">
                {[
                  'Kenya-built & locally optimized',
                  'KNEC exam integration',
                  'M-Pesa fee collection',
                  'Offline-capable mobile app',
                  'MOE curriculum aligned',
                ].map((t) => (
                  <div key={t} className="asc-item">
                    <div className="asc-dot" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </Col>

          {/* Content */}
          <Col lg={6} className="reveal">
            <span className="section-tag">About ShuleBase</span>
            <h2 className="section-title">Built Specifically for Kenyan Schools</h2>
            <p className="section-sub">
              ShuleBase is a comprehensive school management information system (SMIS) designed
              and built to address the unique operational, academic, and financial needs of Kenyan
              schools — from primary to secondary level.
            </p>
            <p className="section-sub mt-3">
              Whether you run a small rural school or a large urban institution with thousands
              of students, ShuleBase scales effortlessly to meet your needs.
            </p>
            <div className="about-features">
              {[
                { icon: '🎓', title: 'Academic Excellence', desc: 'Full curriculum management, grade tracking, and performance analytics aligned to KNEC standards.' },
                { icon: '💳', title: 'Smart Finance', desc: 'Automated fee collection with M-Pesa integration, receipts, and real-time financial reporting.' },
                { icon: '👨‍👩‍👧', title: 'Parent Engagement', desc: 'Keep parents informed via SMS, email alerts, and a dedicated parent portal for results and fees.' },
                { icon: '☁️', title: 'Cloud-Powered', desc: 'Access your school data from any device, anywhere, with enterprise-grade security and backups.' },
              ].map((f) => (
                <div key={f.title} className="af-item">
                  <h4>{f.icon} {f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="features">
      <div className="features-inner">
        <Container style={{ maxWidth: 1180 }}>
          <div className="features-head text-center mb-5 reveal">
            <span className="section-tag">Core Features</span>
            <h2 className="section-title">Everything Your School Needs</h2>
            <p className="section-sub mx-auto">
              A complete suite of tools designed to simplify school administration, enhance
              learning outcomes, and keep every stakeholder connected.
            </p>
          </div>
          <Row className="g-4">
            {FEATURES.map((f) => (
              <Col key={f.title} md={6} lg={4} className="reveal">
                <div className="feat-card">
                  <div className={`feat-icon ${f.iconClass}`}>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div className="feat-tags">
                    {f.tags.map((t) => <span key={t} className="feat-tag">{t}</span>)}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────────────
function HowSection() {
  return (
    <section id="how">
      <Container style={{ maxWidth: 1180 }}>
        <div className="how-head text-center mb-5 reveal">
          <span className="section-tag">Getting Started</span>
          <h2 className="section-title">Up &amp; Running in 4 Simple Steps</h2>
          <p className="section-sub mx-auto">
            We've designed the onboarding process to be as quick and painless as possible.
            Most schools are fully operational within 24 hours.
          </p>
        </div>

        <div className="steps-wrapper position-relative">
          <div className="steps-connector d-none d-lg-block" />
          <Row className="g-4">
            {STEPS.map((s) => (
              <Col key={s.num} xs={12} sm={6} lg={3} className="reveal">
                <div className="step-item">
                  <div className="step-num">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────
function ReviewsSection({ reviews }) {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = dir === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section id="reviews">
      <Container style={{ maxWidth: 1180 }}>
        <div className="reviews-head text-center mb-5 reveal">
          <span className="section-tag">School Reviews</span>
          <h2 className="section-title">What School Leaders Are Saying</h2>
          <p className="section-sub mx-auto">
            Don't take our word for it — hear from principals and administrators who
            transformed their schools with ShuleBase.
          </p>
        </div>

        <div className="reviews-scroll-container">
          <button className="scroll-btn left" onClick={() => scroll('left')}>‹</button>
          <div className="reviews-scroll-wrapper" ref={scrollRef}>
            {reviews?.length === 0 ? (
              <p className="text-center w-100 text-muted">No reviews approved for display yet.</p>
            ) : (
              reviews?.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="stars">{'★'.repeat(r.rating || 5)}</div>
                  <p className="review-text">"{r.content}"</p>
                  <div className="reviewer">
                    <div className="reviewer-avatar">{r.full_name?.[0] || 'U'}</div>
                    <div>
                      <div className="reviewer-name">{r.full_name || 'System User'}</div>
                      <div className="reviewer-school">
                        {r.user_type || 'User'} {r.location ? `· ${r.location}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="scroll-btn right" onClick={() => scroll('right')}>›</button>
        </div>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// PRICING TRIGGER
// ─────────────────────────────────────────────
function PricingTrigger({ onShow }) {
  return (
    <section id="pricing-trigger">
      <Container style={{ maxWidth: 700 }} className="text-center">
        <h2 className="pt-title">Transparent, Affordable Pricing for Every School</h2>
        <p className="pt-sub">
          No hidden fees. No long-term lock-in. Choose the plan that works for your school's size
          and needs. Cancel anytime.
        </p>
        <button className="pt-btn" onClick={onShow}>💳 View Pricing Plans</button>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────
function PricingSection({ visible, onOpenModal }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const prices = isAnnual ? PRICING_ANNUAL : PRICING_MONTHLY;

  const scrollToContact = () =>
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="pricing" className={visible ? 'visible' : ''}>
      <Container style={{ maxWidth: 1180 }}>
        <div className="text-center mb-2">
          <span className="section-tag">Pricing</span>
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-sub mx-auto mb-4">
            All plans include unlimited data storage, free onboarding, and dedicated support.
          </p>
        </div>

        {/* Toggle */}
        <div className="pricing-toggle">
          <span className="toggle-label">Monthly</span>
          <button
            className={`toggle-track ${isAnnual ? 'annual' : ''}`}
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Toggle billing period"
          >
            <div className="toggle-thumb" />
          </button>
          <span className="toggle-label">Annual</span>
          <span className="save-badge">Save 20%</span>
        </div>

        <Row className="g-4 align-items-start">
          {PRICING_PLANS.map((plan, idx) => (
            <Col key={plan.tier} md={12} lg={4} className="reveal">
              <div className={`price-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">🔥 Most Popular</div>}
                <div className="price-tier">{plan.tier}</div>
                <div className="price-amount">
                  <span className="price-currency">KES</span>
                  <span className="price-num">{prices[idx].toLocaleString()}</span>
                  <span className="price-period">/month</span>
                </div>
                <p className="price-desc">{plan.descShort}</p>
                <div className="price-divider" />
                <ul className="price-features">
                  {plan.features.map((f) => (
                    <li key={f.text} className={f.ok ? '' : 'inactive'}>
                      <span className={f.ok ? 'pf-check' : 'pf-x'}>{f.ok ? '✓' : '✗'}</span>
                      {f.text}
                    </li>
                  ))}
                </ul>
                <button
                  className={plan.btnClass}
                  onClick={() =>
                    plan.action === 'register'
                      ? onOpenModal('register')
                      : scrollToContact()
                  }
                >
                  {plan.btnLabel}
                </button>
              </div>
            </Col>
          ))}
        </Row>

        <p className="pricing-note">
          💡 All plans include a <strong>14-day free trial</strong>. No credit card required.
          Free data migration assistance included.
        </p>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────
function ContactSection() {
  const [submitLabel, setSubmitLabel] = useState('📩 Send Message');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setSubmitLabel('Sending...');
    setTimeout(() => {
      setSubmitLabel("✅ Message Sent! We'll be in touch soon.");
      setTimeout(() => {
        setSubmitLabel('📩 Send Message');
        setSubmitting(false);
      }, 4000);
    }, 1500);
  };

  return (
    <section id="contact">
      <Container style={{ maxWidth: 1180 }}>
        <Row className="g-5 align-items-start">
          {/* Info */}
          <Col lg={5} className="reveal contact-info">
            <span className="section-tag">Get In Touch</span>
            <h2>Let's Talk About Your School</h2>
            <p>
              Have questions? Want a personalized demo? Our team is ready to help you understand
              how ShuleBase can transform your school's operations.
            </p>
            {[
              { icon: '📱', title: 'WhatsApp & Phone', body: <a href="https://wa.me/254740338681">+254 740 338 681</a> },
              { icon: '📧', title: 'Email Address', body: <a href="mailto:shulebasesoftware1@gmail.com">shulebasesoftware1@gmail.com</a> },
              { icon: '📍', title: 'Location', body: 'Meru, Kenya — Serving schools nationwide' },
              { icon: '⏰', title: 'Business Hours', body: 'Mon–Fri: 8:00 AM – 6:00 PM · Sat: 9:00 AM – 2:00 PM' },
            ].map((c) => (
              <div key={c.title} className="ci-item">
                <div className="ci-icon">{c.icon}</div>
                <div className="ci-text">
                  <h4>{c.title}</h4>
                  <p>{c.body}</p>
                </div>
              </div>
            ))}
          </Col>

          {/* Form */}
          <Col lg={7} className="reveal">
            <div className="contact-form-card">
              <h3>Send Us a Message</h3>
              <Row className="g-3">
                <Col sm={6}>
                  <label className="form-label-sb">First Name</label>
                  <input className="sb-input" type="text" placeholder="John" />
                </Col>
                <Col sm={6}>
                  <label className="form-label-sb">Last Name</label>
                  <input className="sb-input" type="text" placeholder="Kamau" />
                </Col>
              </Row>
              <div className="mt-3">
                <label className="form-label-sb">School Name</label>
                <input className="sb-input" type="text" placeholder="e.g. St. Mary's Academy" />
              </div>
              <div className="mt-3">
                <label className="form-label-sb">Email Address</label>
                <input className="sb-input" type="email" placeholder="principal@school.co.ke" />
              </div>
              <div className="mt-3">
                <label className="form-label-sb">Phone Number</label>
                <input className="sb-input" type="tel" placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="mt-3">
                <label className="form-label-sb">School Type</label>
                <select className="sb-select">
                  <option>Select school type...</option>
                  <option>Primary School</option>
                  <option>Secondary School</option>
                  <option>Mixed School (Primary &amp; Secondary)</option>
                  <option>College / Tertiary Institution</option>
                </select>
              </div>
              <div className="mt-3">
                <label className="form-label-sb">Message / Enquiry</label>
                <textarea
                  className="sb-textarea"
                  placeholder="Tell us about your school and what you're looking for..."
                />
              </div>
              <button
                className="form-submit mt-3"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitLabel}
              </button>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function SBFooter({ onOpenModal, onShowPricing }) {
  return (
    <footer className="sb-footer">
      <Container style={{ maxWidth: 1180 }}>
        <Row className="g-4">
          {/* Brand */}
          <Col lg={5}>
            <div className="footer-logo">
              <img src={logo} alt="ShuleBase" className="sb-logo-img sb-logo-img--footer" />
            </div>
            <p className="footer-brand-desc">
              The most comprehensive school management system for Kenyan schools. Built with love,
              purpose, and deep understanding of the local education ecosystem.
            </p>
            <div className="social-links">
              <a href="https://wa.me/254740338681" className="social-link" title="WhatsApp">💬</a>
              <a href="mailto:shulebasesoftware1@gmail.com" className="social-link" title="Email">✉️</a>
              <a href="#!" className="social-link" title="Facebook">f</a>
              <a href="#!" className="social-link" title="Twitter">𝕏</a>
            </div>
          </Col>

          {/* Product */}
          <Col sm={4} lg={2}>
            <div className="footer-col-title">Product</div>
            <ul className="footer-col-list">
              <li><a href="#features">Features</a></li>
              <li><a href="#!" onClick={onShowPricing}>Pricing</a></li>
              <li><a href="#how">How It Works</a></li>
              <li><a href="#!" onClick={() => onOpenModal('register')}>Free Trial</a></li>
            </ul>
          </Col>

          {/* Modules */}
          <Col sm={4} lg={2}>
            <div className="footer-col-title">Modules</div>
            <ul className="footer-col-list">
              {['Student Management', 'Fee Management', 'Academics & Exams', 'Staff & HR', 'Analytics'].map((m) => (
                <li key={m}><a href="#features">{m}</a></li>
              ))}
            </ul>
          </Col>

          {/* Support */}
          <Col sm={4} lg={3}>
            <div className="footer-col-title">Support</div>
            <ul className="footer-col-list">
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#!">Documentation</a></li>
              <li><a href="#!">Training Videos</a></li>
              <li><a href="https://wa.me/254740338681">WhatsApp Support</a></li>
              <li><a href="#!">Privacy Policy</a></li>
            </ul>
          </Col>
        </Row>

        <div className="footer-bottom">
          <p>© 2025 ShuleBase. All rights reserved. Built in Kenya 🇰🇪 for Kenyan Schools.</p>
          <div className="footer-bottom-links">
            <a href="#!">Privacy Policy</a>
            <a href="#!">Terms of Service</a>
            <a href="#!">Cookie Policy</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}

// ─────────────────────────────────────────────
// WHATSAPP FLOAT
// ─────────────────────────────────────────────
function WhatsAppFloat() {
  return (
    <div className="wa-float">
      <div className="wa-tooltip">Chat with us on WhatsApp</div>
      <a
        href="https://wa.me/254740338681?text=Hello%20ShuleBase%2C%20I'm%20interested%20in%20learning%20more%20about%20your%20school%20management%20system."
        className="wa-btn"
        target="_blank"
        rel="noreferrer"
        title="Chat on WhatsApp"
      >
        <div className="wa-pulse" />
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.7.7 5.3 2 7.6L.5 31.5l8.2-2.1C10.8 30.6 13.4 31.5 16 31.5c8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.4c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-5 1.3 1.3-4.8-.3-.5C3.6 20.9 3 18.5 3 16 3 8.8 8.8 3 16 3s13 5.8 13 13-5.8 13-13 13zm7.1-9.7c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.3.4-1 1.2-1.2 1.5-.2.3-.5.3-.9.1-.4-.2-1.6-.6-3-1.8-1.1-1-1.8-2.2-2.1-2.6-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6-.1-.2-.9-2.2-1.2-3-.3-.8-.6-.7-.9-.7h-.7c-.3 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.8 5.2.8.4 1.4.6 1.9.7.8.2 1.6.2 2.1.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.2-.3-.3-.7-.5z" />
        </svg>
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────
function AuthModal({ show, defaultTab, onClose }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'login');
  const [status, setStatus] = useState('idle'); // idle | loading | success
  const [successInfo, setSuccessInfo] = useState({ msg: '', sub: '' });

  useEffect(() => {
    if (show) {
      setActiveTab(defaultTab || 'login');
      setStatus('idle');
    }
  }, [show, defaultTab]);

  const handleAuth = (type) => {
    setStatus('loading');
    setTimeout(() => {
      setSuccessInfo(
        type === 'login'
          ? { msg: 'Sign In Successful!', sub: 'Redirecting you to your dashboard...' }
          : { msg: 'Account Created!', sub: 'Welcome! Our team will contact you within 24 hours to set up your school.' }
      );
      setStatus('success');
      setTimeout(onClose, 3000);
    }, 1800);
  };

  return (
    <Modal show={show} onHide={onClose} centered className="sb-modal" backdropClassName="sb-modal-backdrop">
      <Modal.Body>
        {/* Logo */}
        <div className="modal-logo">
          <img src={logo} alt="ShuleBase" className="sb-logo-img sb-logo-img--modal" />
        </div>

        {/* Header (Only shown if tabs aren't providing their own headers internally) */}
        {!['login', 'register'].includes(activeTab) && (
          <div className="text-center mb-3">
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, color: 'var(--navy)', fontSize: 26 }}>
              {activeTab === 'login' ? 'Welcome Back' : 'Register Your School'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--gray)' }}>
              {activeTab === 'login'
                ? 'Sign in to your school dashboard'
                : 'Get started free — 14-day trial included'}
            </p>
          </div>
        )}

        {status === 'success' ? (
          <div className="modal-success">
            <div className="success-icon">🎉</div>
            <div className="success-msg">{successInfo.msg}</div>
            <p className="success-sub">{successInfo.sub}</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="modal-tab-row">
              <button
                className={`modal-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >Log In</button>
              <button
                className={`modal-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >Register School</button>
            </div>

            {/* Login Form */}
            {activeTab === 'login' && (
              <div className="modal-login-container">
                <Login isModal={true} />
              </div>
            )}

            {/* Register Form */}
            {activeTab === 'register' && (
              <div className="modal-register-container">
                <RegisterSchool isModal={true} />
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab]   = useState('login');
  const [pricingVisible, setPricingVisible] = useState(false);
  const [schools, setSchools] = useState([]);
  const [reviews, setReviews] = useState([]);

  useReveal();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [schoolsRes, reviewsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/school/public/schools/`),
          axios.get(`${BASE_URL}/api/school/public/reviews/`)
        ]);
        setSchools(schoolsRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        console.error("Error fetching home data", err);
      }
    };
    fetchData();
  }, []);

  const openModal = useCallback((tab) => {
    setModalTab(tab);
    setModalOpen(true);
  }, []);

  const showPricing = useCallback(() => {
    setPricingVisible(true);
    document.getElementById('pricing-trigger').style.display = 'none';
    setTimeout(() => {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  return (
    <>
      <SBNavbar onOpenModal={openModal} />
      <HeroSection onOpenModal={openModal} />
      <TrustedSection schools={schools} />
      <AboutSection />
      <FeaturesSection />
      <HowSection />
      <ReviewsSection reviews={reviews} />
      <PricingTrigger onShow={showPricing} />
      <PricingSection visible={pricingVisible} onOpenModal={openModal} />
      <ContactSection />
      <SBFooter onOpenModal={openModal} onShowPricing={showPricing} />
      <WhatsAppFloat />
      <AuthModal show={modalOpen} defaultTab={modalTab} onClose={() => setModalOpen(false)} />
    </>
  );
}