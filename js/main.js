/* Michael Agao: portfolio enhancements.
   Vanilla JavaScript (ES6), no dependencies, no build step.
   Sections: theme · mobile menu · scroll-spy · reveal · counters · dialogs · carousel */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  /* ---------- Theme toggle (Light / Dark) ---------- */
  const themeToggle = document.getElementById('theme-toggle');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const readPref = () => {
    try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; }
  };
  const applyTheme = pref => {
    if (pref !== 'light' && pref !== 'dark') pref = 'system';
    const dark = pref === 'dark' || (pref === 'system' && darkQuery.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-pref', pref);
    if (themeToggle) {
      const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.title = label;
      themeToggle.setAttribute('aria-pressed', String(dark));
    }
  };
  applyTheme(readPref());
  themeToggle?.addEventListener('click', () => {
    const pref = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try {
      if (pref === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', pref);
    } catch (e) { /* storage unavailable: the choice still applies for this visit */ }
    applyTheme(pref);
  });
  darkQuery.addEventListener('change', () => {
    if (root.getAttribute('data-theme-pref') === 'system') applyTheme('system');
  });

  /* ---------- Mobile menu (☰) ---------- */
  const header = document.querySelector('.site-header');
  const nav = document.getElementById('site-nav');
  const menuButton = document.querySelector('.menu-toggle');
  const setMenu = (open, restoreFocus = false) => {
    if (!menuButton || !nav) return;
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open && wasOpen && restoreFocus) menuButton.focus();
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  nav?.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
  window.matchMedia('(min-width: 1080px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  /* ---------- Scroll-spy navigation ---------- */
  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]')];
  const spySections = navLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  let lastActive = null;
  let spyPending = false;
  const updateNavigation = () => {
    spyPending = false;
    if (!spySections.length) return;
    const line = header.getBoundingClientRect().height + 80;
    let active = spySections[0];
    spySections.forEach(section => {
      if (section.getBoundingClientRect().top <= line) active = section;
    });
    // At the very bottom of the page, mark the last linked section (Contact) as active.
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) active = spySections[spySections.length - 1];
    if (active === lastActive) return;
    lastActive = active;
    navLinks.forEach(link => {
      const selected = link.hash === '#' + active.id;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  window.addEventListener('scroll', () => {
    if (!spyPending) {
      spyPending = true;
      requestAnimationFrame(updateNavigation);
    }
  }, {passive: true});
  window.addEventListener('resize', updateNavigation);
  updateNavigation();

  // Move keyboard focus into <main> after using the skip link.
  document.querySelector('.skip-link')?.addEventListener('click', () => {
    document.getElementById('main')?.focus({preventScroll: true});
  });

  /* ---------- Fade / slide-in on scroll (skipped for reduced motion) ---------- */
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (!reduceMotion.matches && 'IntersectionObserver' in window && revealItems.length) {
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {rootMargin: '0px 0px -8% 0px', threshold: 0.08});
    revealItems.forEach(item => observer.observe(item));
  }

  /* ---------- Stat counters ---------- */
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        const start = performance.now();
        const tick = now => {
          const progress = Math.min((now - start) / 900, 1);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, {threshold: 0.6});
    document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));
  }

  /* ---------- Accessible dialogs ---------- */
  // Native modal <dialog> traps focus and closes on Escape. We add backdrop-click close,
  // body scroll lock, and returning focus to whatever opened the dialog.
  const openDialogs = new Set();
  const setupDialog = dialog => {
    if (!dialog) return null;
    let trigger = null;
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      openDialogs.delete(dialog);
      if (!openDialogs.size) document.body.classList.remove('dialog-open');
      if (trigger && trigger.isConnected) trigger.focus({preventScroll: true});
      trigger = null;
      dialog.dispatchEvent(new CustomEvent('dialog:closed'));
    });
    return {
      dialog,
      open(from) {
        trigger = from || document.activeElement;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        openDialogs.add(dialog);
        document.body.classList.add('dialog-open');
        dialog.querySelector('.dialog-close')?.focus();
      }
    };
  };

  // Image dialog
  const imageDialog = setupDialog(document.getElementById('image-dialog'));
  const enlarged = imageDialog?.dialog.querySelector('.dialog-image');
  const imageTitle = imageDialog?.dialog.querySelector('#image-dialog-title');
  const imageDescription = imageDialog?.dialog.querySelector('.dialog-description');
  const openImage = ({src, alt, title, description}, from) => {
    if (!imageDialog) return;
    imageDialog.dialog.classList.toggle('certificate-preview', Boolean(from?.closest('.cert-card')));
    enlarged.src = src;
    enlarged.alt = alt || '';
    imageTitle.textContent = title || alt || 'Image';
    imageDescription.textContent = description || '';
    imageDialog.open(from);
  };
  imageDialog?.dialog.addEventListener('dialog:closed', () => enlarged.removeAttribute('src'));

  // Open diagram images and certificate image links in the shared preview.
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-lightbox]');
    if (!button) return;
    const img = button?.querySelector('img');
    const src = button.dataset.imageSrc || img?.currentSrc || img?.src;
    if (!src || !imageDialog) return;
    event.preventDefault();
    const title = button.dataset.title || button.closest('.cert-card')?.querySelector('h3')?.textContent;
    openImage({src, alt: img?.alt || `${title} certificate`, title, description: button.dataset.description}, button);
  });

  // Project details dialog: content is cloned from <template id="project-…">
  const projectDialog = setupDialog(document.getElementById('project-dialog'));
  const projectBody = projectDialog?.dialog.querySelector('.dialog-body');
  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const template = document.getElementById('project-' + button.dataset.project);
      if (!template || !projectDialog) return;
      projectBody.replaceChildren(template.content.cloneNode(true));
      projectDialog.dialog.scrollTop = 0;
      projectDialog.open(button);
    });
  });

  /* ---------- Capstone scroll showcase ---------- */
  (() => {
    const showcase = document.querySelector('.showcase');
    if (!showcase) return;
    const chapters = [
      {
        "label": "Home",
        "shots": [
          {
            "src": "assets/images/screens/ums/home-page.webp",
            "title": "Home Page",
            "description": "Navigation, log in, dark mode, Book an Appointment and live counts of branches, services and stylists."
          },
          {
            "src": "assets/images/screens/ums/branch-selection.webp",
            "title": "Branch Selection",
            "description": "Daraga Main, Yashano Mall and Cabangan, each with address, hours and services."
          },
          {
            "src": "assets/images/screens/ums/inside-leo-mejillano.webp",
            "title": "Inside Leo Mejillano",
            "description": "Introduces the salon, its three branches and the home and event services."
          },
          {
            "src": "assets/images/screens/ums/see-it-for-yourself.webp",
            "title": "See It for Yourself",
            "description": "Drag the handle to compare real before-and-after results, then book that look."
          },
          {
            "src": "assets/images/screens/ums/how-booking-works.webp",
            "title": "How Booking Works",
            "description": "The five booking steps and a sample Pending → Completed status tracker."
          },
          {
            "src": "assets/images/screens/ums/gift-certificates.webp",
            "title": "Gift Certificates",
            "description": "₱500 and ₱1,000 gift certificates, valid for one-time use."
          },
          {
            "src": "assets/images/screens/ums/footer.webp",
            "title": "Footer",
            "description": "Branch addresses, contact details and the salon's Facebook pages."
          }
        ]
      },
      {
        "label": "Services",
        "shots": [
          {
            "src": "assets/images/screens/ums/services-choose-branch.webp",
            "title": "Services – Choose a Branch",
            "description": "Prices are set per branch, so the customer picks a branch first."
          },
          {
            "src": "assets/images/screens/ums/services-pricing.webp",
            "title": "Services & Pricing",
            "description": "Active promos, category filters, search and a Book button on every service."
          },
          {
            "src": "assets/images/screens/ums/wedding-packages.webp",
            "title": "Wedding Packages",
            "description": "Packages A to D with price, inclusions and an Inquire button."
          },
          {
            "src": "assets/images/screens/ums/stylists-team.webp",
            "title": "Stylists & Salon Team",
            "description": "Beauty professionals per branch, with who is on shift right now."
          },
          {
            "src": "assets/images/screens/ums/products.webp",
            "title": "Products",
            "description": "Salon products with search and category filters."
          },
          {
            "src": "assets/images/screens/ums/branches.webp",
            "title": "Branches",
            "description": "Each branch's location, contact numbers, hours and services."
          },
          {
            "src": "assets/images/screens/ums/gallery.webp",
            "title": "Gallery",
            "description": "Video clips of the salons and finished work."
          }
        ]
      },
      {
        "label": "Home & Events",
        "shots": [
          {
            "src": "assets/images/screens/ums/home-events.webp",
            "title": "Home & Events Service",
            "description": "Request a stylist for a wedding, debut, graduation or photoshoot."
          },
          {
            "src": "assets/images/screens/ums/event-categories.webp",
            "title": "Event Categories",
            "description": "Weddings & Debuts, Graduations & Galas, and Personal Events."
          },
          {
            "src": "assets/images/screens/ums/events-process.webp",
            "title": "The Process",
            "description": "Six steps from telling the salon about the event to sharing feedback."
          },
          {
            "src": "assets/images/screens/ums/home-service-form.webp",
            "title": "Home Service Request Form",
            "description": "Customer info, event details, services and review, in four steps."
          },
          {
            "src": "assets/images/screens/ums/rescheduling-reminders.webp",
            "title": "Rescheduling & Reminders",
            "description": "How to move a request online and the rules for rescheduling."
          },
          {
            "src": "assets/images/screens/ums/events-notifications.webp",
            "title": "Notifications",
            "description": "Booking confirmation, reminders, service updates, SMS and email."
          },
          {
            "src": "assets/images/screens/ums/offsite-services.webp",
            "title": "Off-site Services",
            "description": "Makeup, hair styling, lash and brow services and event packages."
          }
        ]
      },
      {
        "label": "Guest Booking",
        "shots": [
          {
            "src": "assets/images/screens/ums/book-as-guest.webp",
            "title": "Book an Appointment",
            "description": "Book as a guest without an account, or track an existing booking."
          },
          {
            "src": "assets/images/screens/ums/guest-step-1.webp",
            "title": "Step 1 · Guest Information",
            "description": "Name, mobile number, optional email and how to get updates."
          },
          {
            "src": "assets/images/screens/ums/guest-step-2.webp",
            "title": "Step 2 · Branch & Services",
            "description": "Choose a branch, then search and pick services."
          },
          {
            "src": "assets/images/screens/ums/guest-step-3.webp",
            "title": "Step 3 · Date & Time",
            "description": "Open time slots for the day; full slots are crossed out."
          },
          {
            "src": "assets/images/screens/ums/guest-step-4.webp",
            "title": "Step 4 · Payment",
            "description": "Deposit or full payment by GCash, Maya, card or cash at the branch."
          },
          {
            "src": "assets/images/screens/ums/payment-result.webp",
            "title": "Online Payment Result",
            "description": "PayMongo returns here with the reference and payment details."
          },
          {
            "src": "assets/images/screens/ums/track-a-booking.webp",
            "title": "Track a Booking",
            "description": "Look up any booking by its reference; no account needed."
          },
          {
            "src": "assets/images/screens/ums/booking-status.webp",
            "title": "Booking Status",
            "description": "Pending → Confirmed → In Progress → Completed, with booking details."
          }
        ]
      },
      {
        "label": "Login",
        "shots": [
          {
            "src": "assets/images/screens/ums/login.webp",
            "title": "Login",
            "description": "One sign-in for customers, admins, cashiers and staff; it opens the right dashboard."
          },
          {
            "src": "assets/images/screens/ums/create-account.webp",
            "title": "Create an Account",
            "description": "Customer sign-up with live password rules and the terms to agree to."
          },
          {
            "src": "assets/images/screens/ums/verify-email.webp",
            "title": "Verify Your Email",
            "description": "A six-digit code sent to the email activates the account."
          },
          {
            "src": "assets/images/screens/ums/forgot-password.webp",
            "title": "Forgot Password",
            "description": "Request a reset code by email."
          },
          {
            "src": "assets/images/screens/ums/reset-code.webp",
            "title": "Enter Your Code",
            "description": "Enter the code within 10 minutes, then set a new password."
          },
          {
            "src": "assets/images/screens/ums/confirm-mobile.webp",
            "title": "Confirm Mobile Number",
            "description": "Links earlier guest bookings and loyalty points to the new account."
          }
        ]
      },
      {
        "label": "Dashboard",
        "shots": [
          {
            "src": "assets/images/screens/ums/customer-dashboard.webp",
            "title": "Customer Dashboard",
            "description": "The next appointment, promos made for the customer and the loyalty card."
          },
          {
            "src": "assets/images/screens/ums/loyalty-card.webp",
            "title": "Digital Loyalty Card",
            "description": "10 stamps: a 20% discount on the 5th visit and a free treatment on the 10th."
          },
          {
            "src": "assets/images/screens/ums/notifications.webp",
            "title": "Notifications",
            "description": "Updates on booking confirmations, payment checks and finished services."
          }
        ]
      },
      {
        "label": "Booking",
        "shots": [
          {
            "src": "assets/images/screens/ums/book-appointment.webp",
            "title": "Book an Appointment",
            "description": "Pick a branch and browse its services with price and duration."
          },
          {
            "src": "assets/images/screens/ums/choose-schedule.webp",
            "title": "Choose Your Schedule",
            "description": "Pick a date and one of the open time slots."
          },
          {
            "src": "assets/images/screens/ums/choose-stylist.webp",
            "title": "Choose a Stylist",
            "description": "Only stylists who are qualified and free at that time are listed."
          },
          {
            "src": "assets/images/screens/ums/booking-details.webp",
            "title": "Booking Details",
            "description": "Review of branch, service, time, stylist, total and amount to pay now."
          },
          {
            "src": "assets/images/screens/ums/payment.webp",
            "title": "Payment",
            "description": "Deposit or full payment by GCash, Maya, card or cash at the branch."
          },
          {
            "src": "assets/images/screens/ums/booking-updates.webp",
            "title": "Booking Updates",
            "description": "Choose email updates, SMS updates, or both."
          },
          {
            "src": "assets/images/screens/ums/review-confirm.webp",
            "title": "Review & Confirm",
            "description": "Booking summary and the terms before paying."
          },
          {
            "src": "assets/images/screens/ums/paymongo-test.webp",
            "title": "GCash Payment (PayMongo)",
            "description": "The PayMongo payment page for GCash, Maya or card."
          },
          {
            "src": "assets/images/screens/ums/payment-not-completed.webp",
            "title": "Payment Not Completed",
            "description": "Retry or switch payment method while the slot is held."
          },
          {
            "src": "assets/images/screens/ums/payment-successful.webp",
            "title": "Payment Successful",
            "description": "Reference, amount paid and the late-arrival reminder."
          }
        ]
      },
      {
        "label": "My Account",
        "shots": [
          {
            "src": "assets/images/screens/ums/my-bookings.webp",
            "title": "My Bookings",
            "description": "Upcoming appointments and history, with tracking, reschedule and cancel."
          },
          {
            "src": "assets/images/screens/ums/reschedule.webp",
            "title": "Reschedule Appointment",
            "description": "Shows the current schedule and the deadline for changing it online."
          },
          {
            "src": "assets/images/screens/ums/confirm-cancellation.webp",
            "title": "Confirm Cancellation",
            "description": "Shows the deposit policy; reschedule instead or keep the appointment."
          },
          {
            "src": "assets/images/screens/ums/home-service.webp",
            "title": "Home Service",
            "description": "Home and event requests with their quote, payment summary and status."
          },
          {
            "src": "assets/images/screens/ums/request-venue.webp",
            "title": "Request Home Service – Venue",
            "description": "Venue address in Albay, event type and number of clients."
          },
          {
            "src": "assets/images/screens/ums/request-services.webp",
            "title": "Request Home Service – Services",
            "description": "Services, estimated cost, responsible branch and preferred schedule."
          },
          {
            "src": "assets/images/screens/ums/request-review.webp",
            "title": "Request Home Service – Review",
            "description": "Payment notice, service notes and the request summary."
          },
          {
            "src": "assets/images/screens/ums/track-booking.webp",
            "title": "Track Booking",
            "description": "Booking progress, latest status update and payment details."
          },
          {
            "src": "assets/images/screens/ums/my-feedback.webp",
            "title": "My Feedback",
            "description": "Rate and review completed appointments."
          },
          {
            "src": "assets/images/screens/ums/my-profile.webp",
            "title": "My Profile",
            "description": "Photo, personal details, address and notification preferences."
          },
          {
            "src": "assets/images/screens/ums/change-password.webp",
            "title": "Change Password",
            "description": "New password with live rules, confirmed by an email code."
          }
        ]
      }
    ];
    const steps = chapters.flatMap((chapter, c) => chapter.shots.map(shot => ({...shot, chapter: c})));
    const shotCount = steps.length;
    // Floating cards beside the screenshot: one key feature and one part of my work per chapter.
    const extras = [
      {feature: 'Three branches under one brand, each with its own hours, services and prices.', mine: 'UI/UX design of the public pages and layouts.'},
      {feature: 'Per-branch price lists with promos, category filters and search.', mine: 'Web development with PHP 8 and MySQL.'},
      {feature: 'Home and event service requests with quotes and rescheduling rules.', mine: 'System planning and analysis, with data flow diagrams and flowcharts.'},
      {feature: 'Book in under a minute with just a name and mobile number; no account needed.', mine: 'Email and SMS one-time codes through Brevo and textbee.'},
      {feature: 'One login for customers, admins, cashiers and staff.', mine: 'Role-based access for five user panels.'},
      {feature: 'Digital loyalty card: 20% off on the 5th visit and a free treatment on the 10th.', mine: 'Responsive front end with HTML, Tailwind CSS and JavaScript.'},
      {feature: 'Pay a deposit or in full by GCash, Maya, card or cash at the branch.', mine: 'PayMongo payments, tested with automated tests and a mock PayMongo server.'},
      {feature: 'Track, reschedule or cancel bookings, request home service and leave reviews.', mine: 'Deployed with Docker to Vercel; wrote the technical documentation and user manual.'}
    ];
    const featureCard = showcase.querySelector('.sc-feature');
    const mineCard = showcase.querySelector('.sc-mine');
    let shownChapter = -1;
    const firstDetails = steps.findIndex(item => item.details);
    const detailsCard = showcase.querySelector('.sc-details');
    detailsCard.querySelectorAll('.works-block').forEach(block => {
      block.querySelectorAll('li').forEach((li, k) => li.style.setProperty('--i', k));
    });
    const revealDetails = parts => {
      for (let k = 1; k <= 3; k++) detailsCard.classList.toggle('r' + k, parts >= k);
    };
    const pad = n => String(n).padStart(2, '0');
    const sticky = showcase.querySelector('.sc-sticky');
    const wins = showcase.querySelector('.sc-wins');
    const stepList = showcase.querySelector('.sc-steps');
    const info = showcase.querySelector('.sc-info');
    const num = showcase.querySelector('.sc-num-big');
    const numOf = showcase.querySelector('.sc-num-of');
    const chapterLabel = showcase.querySelector('.sc-chapter');
    const infoTitle = showcase.querySelector('.sc-info-title');
    const infoText = showcase.querySelector('.sc-info-text');
    const pinned = window.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    showcase.style.setProperty('--steps', steps.length);
    numOf.textContent = '/ ' + shotCount;
    stepList.style.setProperty('--n', chapters.length);

    const cards = steps.map((item, i) => {
      if (item.details) {
        detailsCard.classList.add('sc-win');
        return detailsCard;
      }
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'sc-win';
      card.setAttribute('aria-label', 'Enlarge ' + item.title + ' screenshot');
      card.innerHTML = '<span class="sc-bar"><span class="sc-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="sc-url">leo-mejillano-salon.site</span></span>';
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = 'Salon system: ' + item.title;
      img.width = 1440;
      img.height = 900;
      img.loading = i < 2 ? 'eager' : 'lazy';
      const cap = document.createElement('span');
      cap.className = 'sc-cap';
      cap.innerHTML = '<small></small><b></b><span></span>';
      cap.querySelector('small').textContent = pad(i + 1) + ' / ' + shotCount + ' · ' + chapters[item.chapter].label;
      cap.querySelector('b').textContent = item.title;
      cap.querySelector('span').textContent = item.description;
      card.append(img, cap);
      card.addEventListener('click', () => openImage({src: item.src, alt: img.alt, title: item.title, description: item.description}, card));
      wins.append(card);
      return card;
    });
    const stepButtons = chapters.map((chapter, c) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = '<span class="sc-dot"></span><span class="sc-step-label"></span>';
      button.querySelector('.sc-dot').textContent = c + 1;
      button.querySelector('.sc-step-label').textContent = chapter.label;
      button.addEventListener('click', () => go(steps.findIndex(item => item.chapter === c)));
      li.append(button);
      stepList.append(li);
      return button;
    });

    let active = -1;
    const render = step => {
      if (step === active) return;
      active = step;
      const item = steps[step];
      const current = item.details ? firstDetails : step;
      cards.forEach((card, i) => {
        if (steps[i].details && i !== firstDetails) return;
        card.classList.toggle('is-active', i === current);
        card.classList.toggle('is-past', i < current);
        card.classList.toggle('is-next', i > current);
        if (!steps[i].details) card.tabIndex = i === step || !pinned.matches ? 0 : -1;
      });
      if (pinned.matches) revealDetails(item.details ? item.part + 1 : 0);
      stepButtons.forEach((button, c) => {
        button.parentElement.classList.toggle('is-done', c < item.chapter);
        button.parentElement.classList.toggle('is-current', c === item.chapter);
        if (c === item.chapter) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      const first = steps.findIndex(s => s.chapter === item.chapter);
      const within = item.details ? 0 : (step - first) / chapters[item.chapter].shots.length;
      stepList.style.setProperty('--fill', Math.min(1, (item.chapter + within) / (chapters.length - 1)).toFixed(4));
      info.classList.remove('swap');
      void info.offsetWidth;
      info.classList.add('swap');
      info.classList.toggle('started', step > 0);
      info.classList.toggle('is-details', Boolean(item.details));
      showcase.classList.toggle('at-details', Boolean(item.details));
      num.textContent = pad(Math.min(step + 1, shotCount));
      chapterLabel.textContent = 'Part ' + (item.chapter + 1) + ' · ' + chapters[item.chapter].label;
      if (item.chapter !== shownChapter && extras[item.chapter]) {
        shownChapter = item.chapter;
        featureCard.querySelector('.sc-float-text').textContent = extras[item.chapter].feature;
        mineCard.querySelector('.sc-float-text').textContent = extras[item.chapter].mine;
        [featureCard, mineCard].forEach(card => { card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap'); });
      }
      infoTitle.textContent = item.title;
      infoText.textContent = item.description;
    };

    const headerHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
    const travel = () => Math.max(1, showcase.offsetHeight - sticky.offsetHeight);
    const fromScroll = () => {
      if (showcase.hidden) return;
      if (pinned.matches) {
        const progress = Math.min(1, Math.max(0, (headerHeight() - showcase.getBoundingClientRect().top) / travel()));
        render(Math.min(steps.length - 1, Math.floor(progress * steps.length)));
      } else {
        const width = cards[0].offsetWidth + parseFloat(getComputedStyle(wins).columnGap || 0);
        const atEnd = wins.scrollLeft >= wins.scrollWidth - wins.clientWidth - 2;
        render(atEnd ? shotCount - 1 : Math.min(shotCount - 1, Math.max(0, Math.round(wins.scrollLeft / width))));
      }
    };
    const go = step => {
      if (pinned.matches) {
        const top = window.scrollY + showcase.getBoundingClientRect().top - headerHeight() + (step + 0.5) / steps.length * travel();
        window.scrollTo({top, behavior: scrollBehavior()});
      } else if (steps[step].details) {
        render(step);
        detailsCard.scrollIntoView({behavior: scrollBehavior(), block: 'start'});
      } else {
        wins.scrollTo({left: cards[step].offsetLeft, behavior: scrollBehavior()});
      }
    };

    let queued = false;
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fromScroll(); });
    };
    window.addEventListener('scroll', () => { if (pinned.matches) queue(); }, {passive: true});
    window.addEventListener('resize', queue);
    wins.addEventListener('scroll', queue, {passive: true});
    // On phones the card sits below the stepper; reveal its columns when it scrolls into view.
    const mobileReveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || pinned.matches) return;
        [1, 2, 3].forEach(k => setTimeout(() => revealDetails(k), (k - 1) * 350));
        mobileReveal.unobserve(entry.target);
      });
    }, {threshold: 0.15});
    const placeDetails = () => {
      sticky.append(detailsCard);
      if (!pinned.matches) mobileReveal.observe(detailsCard);
    };
    placeDetails();
    pinned.addEventListener('change', () => { placeDetails(); active = -1; fromScroll(); });
    render(0);
    fromScroll();
  })();
})();

// Phones: dots under each swipe carousel (Education, Experience, Certificates, Other projects).
(() => {
  const phone = window.matchMedia('(max-width: 759px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.m-swipe').forEach(track => {
    const cards = [...track.children];
    if (cards.length < 2) return;
    const label = track.dataset.swipeLabel || 'Items';
    const dots = document.createElement('div');
    dots.className = 'swipe-dots';
    dots.setAttribute('aria-label', label + ' carousel');
    const buttons = cards.map((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', label + ': show ' + (i + 1) + ' of ' + cards.length);
      b.addEventListener('click', () => {
        track.scrollTo({left: card.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: reduce.matches ? 'auto' : 'smooth'});
      });
      dots.append(b);
      return b;
    });
    const count = document.createElement('span');
    count.className = 'swipe-count';
    count.setAttribute('aria-hidden', 'true');
    dots.append(count);
    track.after(dots);

    let current = -1;
    const update = () => {
      if (!phone.matches) return;
      const start = track.scrollLeft;
      let best = 0, bestDist = Infinity;
      cards.forEach((card, i) => {
        const d = Math.abs(card.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft) - start);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4) best = cards.length - 1;
      if (best === current) return;
      current = best;
      buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === best)));
      count.textContent = (best + 1) + ' / ' + cards.length;
    };
    let frame = 0;
    track.addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }, {passive: true});
    phone.addEventListener('change', () => { current = -1; update(); });
    update();
  });
})();
