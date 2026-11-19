/* Michael Agao — portfolio enhancements.
   Vanilla JavaScript (ES6), no dependencies, no build step.
   Sections: theme · mobile menu · scroll-spy · reveal · counters · dialogs · contact form · carousel */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  /* ---------- Theme selector (System / Light / Dark) ---------- */
  const themeSelect = document.getElementById('theme-select');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const readPref = () => {
    try { return localStorage.getItem('theme') || 'system'; } catch (e) { return 'system'; }
  };
  const applyTheme = pref => {
    if (pref !== 'light' && pref !== 'dark') pref = 'system';
    const dark = pref === 'dark' || (pref === 'system' && darkQuery.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-pref', pref);
    if (themeSelect) themeSelect.value = pref;
  };
  applyTheme(readPref());
  themeSelect?.addEventListener('change', () => {
    const pref = themeSelect.value;
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
    enlarged.src = src;
    enlarged.alt = alt || '';
    imageTitle.textContent = title || alt || 'Image';
    imageDescription.textContent = description || '';
    imageDialog.open(from);
  };
  imageDialog?.dialog.addEventListener('dialog:closed', () => enlarged.removeAttribute('src'));

  // Any [data-lightbox] button containing an <img> opens it in the image dialog
  // (E-Sumbong diagrams now, certificate images once they are added).
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-lightbox]');
    const img = button?.querySelector('img');
    if (!img) return;
    openImage({src: img.currentSrc || img.src, alt: img.alt, title: button.dataset.title, description: button.dataset.description}, button);
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

  /* ---------- Contact form → Formspree (fetch, no page reload) ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('[type="submit"]');
    const fields = [...form.querySelectorAll('input:not([name="_gotcha"]), textarea')];
    const setStatus = (type, message) => {
      status.classList.toggle('is-error', type === 'error');
      status.classList.toggle('is-success', type === 'success');
      status.textContent = message;
    };
    const fallback = ' You can also email me at agao.michaelkharl.mka@gmail.com.';

    form.addEventListener('submit', async event => {
      event.preventDefault();
      let firstInvalid = null;
      fields.forEach(field => {
        if (field.value.trim() === '') field.value = '';
        const valid = field.checkValidity();
        field.setAttribute('aria-invalid', String(!valid));
        if (!valid && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        setStatus('error', 'Please fill in every field with a valid value.');
        firstInvalid.focus();
        return;
      }
      const endpoint = form.getAttribute('action') || '';
      if (endpoint.includes('YOUR_FORM_ID')) {
        setStatus('error', 'The contact form is not connected yet. Please use the "Say hello" button instead.' + fallback);
        return;
      }
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      setStatus('', 'Sending your message…');
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: {Accept: 'application/json'}
        });
        if (response.ok) {
          form.reset();
          fields.forEach(field => field.removeAttribute('aria-invalid'));
          setStatus('success', 'Thank you! Your message has been sent.');
        } else {
          let message = 'Sorry, your message could not be sent. Please try again.';
          try {
            const data = await response.json();
            if (Array.isArray(data.errors) && data.errors.length) message = data.errors.map(error => error.message).join(' ');
          } catch (e) { /* non-JSON error response */ }
          setStatus('error', message + fallback);
        }
      } catch (e) {
        setStatus('error', 'Network error: your message was not sent. Please check your connection and try again.' + fallback);
      } finally {
        submit.disabled = false;
        form.removeAttribute('aria-busy');
      }
    });
    form.addEventListener('input', event => {
      if (event.target.getAttribute('aria-invalid') === 'true' && event.target.checkValidity()) {
        event.target.setAttribute('aria-invalid', 'false');
      }
    });
  }

  /* ---------- Capstone screenshot carousel ---------- */
  const screens = [
    {category: 'guest', n: '01', title: "Home Page", description: "Navigation, log in, dark mode, Book an Appointment and live salon stats."},
    {category: 'guest', n: '02', title: "Branch Selection", description: "Daraga Main, Yashano Mall and Cabangan with address, hours and services."},
    {category: 'guest', n: '03', title: "How Booking Works", description: "Five booking steps and a sample Pending → Completed status tracker."},
    {category: 'guest', n: '04', title: "Services & Pricing", description: "Pick a branch first, since each branch has its own price list."},
    {category: 'guest', n: '05', title: "Branch Price List", description: "Active promos, category filters, search and a Book button on every service."},
    {category: 'guest', n: '06', title: "Wedding Packages", description: "Packages A to D with an Inquire button."},
    {category: 'guest', n: '07', title: "Stylists & Salon Team", description: "Team members per branch, grouped by specialty, with live availability."},
    {category: 'guest', n: '08', title: "Products", description: "Salon products with search and category filters."},
    {category: 'guest', n: '09', title: "Branches", description: "Each branch's location, hours, contact numbers and directions."},
    {category: 'guest', n: '10', title: "Home & Events Service", description: "Request a stylist for a wedding, debut, graduation or photoshoot."},
    {category: 'guest', n: '11', title: "Home Service Request", description: "Four steps: your info, event, services and review."},
    {category: 'guest', n: '12', title: "Gallery", description: "Photos and videos of the salons and finished work."},
    {category: 'guest', n: '13', title: "Book an Appointment", description: "Book as a guest or track an existing booking."},
    {category: 'guest', n: '14', title: "Step 1 · Guest Information", description: "Name, mobile number, optional email and how to get updates."},
    {category: 'guest', n: '15', title: "Step 2 · Branch & Services", description: "Choose a branch, then search and pick services."},
    {category: 'guest', n: '16', title: "Step 3 · Date, Time & Stylist", description: "Open time slots, with each stylist's live status: available, busy or day off."},
    {category: 'guest', n: '17', title: "Step 4 · Payment", description: "Deposit or full payment by GCash, Maya, card or cash at the branch."},
    {category: 'guest', n: '18', title: "Step 5 · Review Booking", description: "Check every detail, then continue to email or SMS verification."},
    {category: 'guest', n: '19', title: "Payment Successful", description: "PayMongo returns here with the reference, amount and method."},
    {category: 'guest', n: '20', title: "Track a Booking", description: "Look up any booking by its reference; no account needed."},
    {category: 'guest', n: '21', title: "Booking Status", description: "Pending → Confirmed → In Progress → Completed, with booking details."},
    {category: 'account', n: '22', title: "Login", description: "One redesigned sign-in for customers, admins, cashiers and staff."},
    {category: 'account', n: '23', title: "Create an Account", description: "Customer sign-up that links earlier guest bookings by mobile number."},
    {category: 'account', n: '24', title: "Verify Your Email", description: "Six-digit code to activate the account."},
    {category: 'account', n: '25', title: "Forgot Password", description: "Request a reset code by email."},
    {category: 'account', n: '26', title: "Enter Your Code", description: "Enter the code, then set a new password."},
    {category: 'account', n: '27', title: "Set Your Password", description: "New staff and cashier accounts set their password from an email link."}
  ].map(item => ({
    ...item,
    src: 'assets/images/screens/' + item.n + '.webp',
    thumbnail: 'assets/images/screens/thumbs/' + item.n + '.webp'
  }));

  const tour = document.querySelector('.tour');
  if (!tour) return;
  const tabs = [...tour.querySelectorAll('[role="tab"]')];
  const panel = tour.querySelector('[role="tabpanel"]');
  const display = tour.querySelector('.tshot');
  const stage = tour.querySelector('.tour-stage');
  const strip = tour.querySelector('.tstrip');
  const counter = tour.querySelector('.counter');
  const title = tour.querySelector('.screen-title');
  const categoryBadge = tour.querySelector('.tour-panel');
  const description = tour.querySelector('.tour-desc');
  const labels = {guest: 'Guest', account: 'Login & Account'};
  let category = 'guest';
  let index = 0;
  let items = [];
  let thumbButtons = [];
  const current = () => items[index];

  const keepThumbnailVisible = button => {
    const box = button.getBoundingClientRect();
    const frame = strip.getBoundingClientRect();
    if (box.left < frame.left || box.right > frame.right) {
      const offset = strip.scrollLeft + box.left - frame.left - (strip.clientWidth - box.width) / 2;
      strip.scrollTo({left: offset, behavior: scrollBehavior()});
    }
  };
  const show = nextIndex => {
    index = (nextIndex + items.length) % items.length;
    const item = current();
    display.src = item.src;
    display.alt = 'Salon system — ' + item.title;
    stage.setAttribute('aria-label', 'Enlarge ' + item.title + ' screenshot');
    title.textContent = item.title;
    categoryBadge.textContent = labels[category];
    description.textContent = item.description;
    counter.textContent = (index + 1) + ' / ' + items.length;
    counter.setAttribute('aria-label', 'Screenshot ' + (index + 1) + ' of ' + items.length + ' in ' + labels[category]);
    thumbButtons.forEach((button, position) => {
      const selected = position === index;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    keepThumbnailVisible(thumbButtons[index]);
  };
  const switchCategory = nextCategory => {
    category = nextCategory;
    items = screens.filter(item => item.category === category);
    tabs.forEach(tab => {
      const selected = tab.dataset.category === category;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', tab.id);
    });
    strip.replaceChildren();
    strip.setAttribute('aria-label', labels[category] + ' screenshots');
    thumbButtons = items.map((item, position) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb';
      button.setAttribute('aria-label', 'Show ' + item.title + ', screenshot ' + (position + 1) + ' of ' + items.length);
      button.setAttribute('aria-pressed', 'false');
      const image = document.createElement('img');
      image.src = item.thumbnail;
      image.alt = '';
      image.loading = 'lazy';
      image.width = 360;
      image.height = 225;
      const label = document.createElement('span');
      label.textContent = item.title;
      button.append(image, label);
      button.addEventListener('click', () => show(position));
      button.addEventListener('keydown', event => {
        let next = position;
        if (event.key === 'ArrowRight') next++;
        else if (event.key === 'ArrowLeft') next--;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else return;
        event.preventDefault();
        show(next);
        thumbButtons[index].focus({preventScroll: true});
      });
      strip.append(button);
      return button;
    });
    strip.scrollLeft = 0;
    show(0);
  };
  tabs.forEach((tab, position) => {
    tab.addEventListener('click', () => switchCategory(tab.dataset.category));
    tab.addEventListener('keydown', event => {
      let next = position;
      if (event.key === 'ArrowRight') next++;
      else if (event.key === 'ArrowLeft') next--;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      switchCategory(target.dataset.category);
      target.focus();
    });
  });
  tour.querySelector('.prev').addEventListener('click', () => show(index - 1));
  tour.querySelector('.next').addEventListener('click', () => show(index + 1));
  panel.addEventListener('keydown', event => {
    if (event.target.closest('.tstrip')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  stage.addEventListener('click', () => {
    const item = current();
    openImage({src: item.src, alt: display.alt, title: labels[category] + ' — ' + item.title, description: item.description}, stage);
  });
  switchCategory('guest');
})();
