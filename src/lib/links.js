import site from '../content/site.json';

const c = site.contact;
const digits = (c.whatsappNumber || '').replace(/[^\d]/g, '');

export const fiverr = c.fiverrUrl;
export const whatsapp = digits
  ? { href: `https://wa.me/${digits}`, label: c.whatsappNumber, ready: true }
  : { href: '/contact#quote', label: c.whatsappLabel, ready: false };
export const email = c.email
  ? { href: `mailto:${c.email}`, label: c.email, ready: true }
  : { href: '/contact#quote', label: c.emailLabel, ready: false };

export const nav = [
  { href: '/work', label: 'Work', key: 'work' },
  { href: '/services', label: 'Services', key: 'services' },
  { href: '/pricing', label: 'Pricing', key: 'pricing' },
  { href: '/about', label: 'About', key: 'about' },
  { href: '/faq', label: 'FAQ', key: 'faq' },
];

export const ytThumb = (id) => (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
