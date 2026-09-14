import {MapPin,ChevronDown} from 'lucide-react';
export const HeadlineBlock=()=> <section className="headline-block"><div>CHAMOU.</div><div>CHEGOU.</div></section>;
export const FeatureCard=()=> <article className="feature-card"><MapPin size={32} strokeWidth={1.75}/><h3>Feito pra sua cidade</h3><p>Operação local, experiência profissional e tudo que importa a poucos toques.</p></article>;
export const StatBlock=()=> <div className="stat"><strong>3×</strong><i/><span>mais caminhos pra chamar e vender</span></div>;
export const CtaBand=()=> <section className="cta-band"><h2>Seu restaurante. Sua cidade. Seu Bora Zé.</h2><a className="btn white">Cadastrar meu negócio</a></section>;
export const Testimonial=()=> <figure className="testimonial"><div className="avatar"/><figcaption><b>Marcos Oliveira</b><span>Araci, BA</span></figcaption><blockquote>Agora o pedido chega organizado e eu consigo focar na cozinha.</blockquote></figure>;
export const FaqAccordion=()=> <details className="faq"><summary>O Bora Zé funciona na minha cidade?<ChevronDown size={20}/></summary><p>Estamos abrindo novas cidades por etapas. Cadastre seu interesse e a gente avisa quando chegar.</p></details>;
export const FooterMarketing=()=> <footer className="footer"><b>boraZé!</b><nav><a>Delivery</a><a>Moto</a><a>Mercado</a></nav><small>© Bora Zé. CHAMOU. CHEGOU.</small></footer>;
export function Badge({variant='new'}:{variant?:'new'|'promo'|'soon'}){return <span className={`badge badge-${variant}`}>{{new:'NOVO',promo:'PROMO',soon:'EM BREVE'}[variant]}</span>}
export const NavbarMarketing=()=> <header className="navbar"><b>boraZé!</b><nav><a>Pra você</a><a>Restaurantes</a><a>Mototaxistas</a><a>Cidades</a></nav><a className="btn primary">Baixar o app</a><button aria-label="Abrir menu">☰</button></header>;
