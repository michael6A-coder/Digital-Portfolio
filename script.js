/* Vanilla JavaScript enhancements. No build step or runtime dependencies. */
(() => {
  'use strict';
  const menu = document.querySelector('.menu-toggle');
  const links = document.querySelector('#nav-links');
  const navLinks = [...links.querySelectorAll('a')];
  const closeMenu = (restoreFocus = false) => {
    const wasOpen = menu.getAttribute('aria-expanded') === 'true';
    links.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation menu');
    if (wasOpen && restoreFocus) menu.focus();
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    links.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  });
  navLinks.forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('header')) closeMenu();
  });
  const desktop = window.matchMedia('(min-width: 769px)');
  desktop.addEventListener('change', event => { if (event.matches) closeMenu(); });

  const sections = [...document.querySelectorAll('main > section[id]')];
  let scrollPending = false;
  const updateNavigation = () => {
    const line = document.querySelector('header').getBoundingClientRect().height + 100;
    let active = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= line) active = section;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) active = sections.at(-1);
    navLinks.forEach(link => {
      const selected = link.hash === '#' + active.id;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollPending) {
      scrollPending = true;
      requestAnimationFrame(updateNavigation);
    }
  }, {passive:true});
  window.addEventListener('resize', updateNavigation);
  updateNavigation();

  const records = window.portfolioGallery || [];
  const tour = document.querySelector('.tour');
  if (!tour || !records.length) return;
  const tabs = [...tour.querySelectorAll('[role="tab"]')];
  const panel = tour.querySelector('[role="tabpanel"]');
  const display = tour.querySelector('.tshot');
  const stage = tour.querySelector('.tour-stage');
  const strip = tour.querySelector('.tstrip');
  const counter = tour.querySelector('.counter');
  const title = tour.querySelector('.screen-title');
  const categoryBadge = tour.querySelector('.tour-panel');
  const description = tour.querySelector('.tour-desc');
  const labels = {guest:'Guest', account:'Login & Account'};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      strip.scrollTo({left:offset, behavior:reduceMotion.matches ? 'auto' : 'smooth'});
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
    items = records.filter(item => item.category === category);
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
      image.src = item.thumbnail || item.src;
      image.alt = '';
      image.loading = 'lazy';
      image.width = 160;
      image.height = 90;
      image.addEventListener('error', () => {
        if (image.getAttribute('src') !== item.src) image.src = item.src;
      }, {once:true});
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
        thumbButtons[index].focus({preventScroll:true});
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

  const dialog = document.querySelector('.image-dialog');
  const enlarged = dialog.querySelector('.dialog-image');
  const dialogTitle = dialog.querySelector('#image-dialog-title');
  const dialogDescription = dialog.querySelector('.dialog-description');
  let dialogTrigger = null;
  stage.addEventListener('click', () => {
    const item = current();
    dialogTrigger = document.activeElement;
    enlarged.src = item.src;
    enlarged.alt = display.alt;
    dialogTitle.textContent = labels[category] + ' — ' + item.title;
    dialogDescription.textContent = item.description;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.querySelector('.dialog-close').focus();
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  // Native modal dialogs contain focus and close on Escape.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (dialogTrigger?.isConnected) dialogTrigger.focus({preventScroll:true});
    enlarged.removeAttribute('src');
  });
  switchCategory('guest');
})();
