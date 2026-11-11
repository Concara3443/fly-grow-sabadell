// Plantillas de los correos que reciben estudiantes y empresas.
// HTML de correo: tablas + estilos inline (Gmail/Outlook ignoran <style> y CSS moderno),
// fotos en JPG (Outlook no lee WebP), y siempre version en texto plano (ayuda a no caer en spam).
// Tono: profesional. Estudiantes de "tu" sin coloquialismos; empresas de "usted".
const GCAL = require('./gcal.json');

const BASE = process.env.PUBLIC_URL || 'https://flyandgrow.es';
const MAPS = 'https://maps.app.goo.gl/AoXZpFzdLGN8G7he6';
const INSTAGRAM = 'https://www.instagram.com/flyandgrow.sabadell/';

const C = { ink: '#223D58', night: '#0B1522', paper: '#EDEFF0', soft: '#5B6E82', line: '#DCE2E8', green: '#008539', greenBg: '#EAF5EE', sky: '#9CBBDC' };
const DISPLAY = "'Bebas Neue',Impact,'Arial Narrow Bold','Arial Narrow',Arial,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,'Courier New',monospace";
const BODY = "Barlow,'Segoe UI',Helvetica,Arial,sans-serif";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const firstName = (n) => String(n).trim().split(/\s+/)[0];
const home = (l) => `${BASE}/${l === 'ca' ? 'ca/' : ''}`;
const lang = (l) => (l === 'ca' ? 'ca' : 'es');

const button = (href, label, bg = C.ink, fg = C.paper, extra = '') =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${bg};color:${fg};font-family:${MONO};font-size:14px;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:3px;margin:4px 0;${extra}">${label}</a>`;
const outline = (href, label) => button(href, label, '#ffffff', C.ink, `border:1px solid ${C.ink};`);
const h2 = (t) => `<h2 style="margin:26px 0 8px;font-family:${DISPLAY};font-weight:400;font-size:24px;letter-spacing:.02em;color:${C.ink};text-transform:uppercase">${t}</h2>`;

// tira tipo tarjeta de embarque: Fecha / Hora / Lugar
const board = (cells) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ink};border-radius:4px">
    <tr>${cells.map(([l, v], i) => `
      <td style="padding:14px 16px;${i ? 'border-left:1px dashed #4A6680;' : ''}vertical-align:top">
        <div style="font-family:${MONO};font-size:11px;color:${C.sky};letter-spacing:.06em">${l}</div>
        <div style="font-family:${MONO};font-size:16px;font-weight:700;color:${C.paper};margin-top:4px">${v}</div>
      </td>`).join('')}
    </tr>
  </table>`;

const greenBox = (title, text, href, label) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;background:${C.greenBg};border:1px solid #BFE3CB;border-radius:4px"><tr><td style="padding:18px 20px">
    <div style="font-family:${BODY};font-weight:700;font-size:16px;color:#00672C">${title}</div>
    <p style="margin:6px 0 14px">${text}</p>
    ${button(href, label, C.green, '#ffffff')}
  </td></tr></table>`;

function layout({ lang: l, preheader, photo, photoAlt, title, content, footer, privacy }) {
  return `<!doctype html>
<html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#E9EDF1">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EDF1"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden">
    <tr><td style="background:${C.night};padding:18px 24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><a href="${home(l)}" style="text-decoration:none"><span style="display:inline-block;background:${C.paper};border-radius:2px;padding:7px 12px"><img src="${BASE}/assets/logo-color.png" width="130" alt="Fly &amp; Grow Sabadell" style="display:block;width:130px;height:auto;border:0"></span></a></td>
        <td align="right" style="font-family:${BODY};font-weight:700;font-size:20px;color:#1FA24C">UAB</td>
      </tr></table>
    </td></tr>
    <tr><td><img src="${BASE}/assets/email/${photo}" width="600" alt="${escapeHtml(photoAlt)}" style="display:block;width:100%;height:auto;border:0"></td></tr>
    <tr><td style="padding:28px 28px 8px;font-family:${BODY};font-size:16px;line-height:1.55;color:#2B3A4A">
      <h1 style="margin:0 0 12px;font-family:${DISPLAY};font-weight:400;font-size:38px;line-height:1.05;letter-spacing:.02em;color:${C.ink};text-transform:uppercase">${title}</h1>
      ${content}
    </td></tr>
    <tr><td style="padding:22px 28px 28px;border-top:1px solid ${C.line};font-family:${BODY};font-size:12.5px;line-height:1.6;color:${C.soft}">
      ${footer}<br>
      Escola d'Enginyeria UAB, Carrer dels Emprius 2, 08202 Sabadell<br>
      <a href="${INSTAGRAM}" style="color:${C.soft}">@flyandgrow.sabadell</a>&nbsp;&nbsp;&nbsp;<a href="${home(l)}privacidad/" style="color:${C.soft}">${privacy}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ---------- estudiantes ----------
const S = {
  es: {
    privacy: 'Política de privacidad',
    board: [['Fecha', 'MIÉ 05 MAY 2027'], ['Hora', '15:00'], ['Lugar', 'Campus Sabadell']],
    hello: (n) => `Hola, ${n}:`,
    footer: 'Recibes este correo porque te has inscrito en flyandgrow.es. Para cualquier consulta, puedes responder directamente a este mensaje.',
    photoAlt: 'Equipo organizador de la 1ª edición de Fly & Grow Sabadell',
    sign: '<b>Organización de Fly &amp; Grow Sabadell</b>',
    signText: 'Organización de Fly & Grow Sabadell',
    speedTitle: 'Último paso para las Entrevistas Express',
    speedText: 'Crea tu perfil de candidato con tu correo UAB antes del 25 de abril. Las empresas seleccionan a quién entrevistar antes del congreso: sin perfil no es posible optar a una entrevista.',
    speedBtn: 'Crear mi perfil',
    progBtn: 'Ver el programa completo',
    invTitle: 'Invita a tus compañeros',
    invText: 'Comparte tu enlace personal. Si se inscriben tres personas con él, participarás en el sorteo de premios de Fly &amp; Grow Sabadell.',
    invBtn: 'Compartir por WhatsApp',
    invWa: (url) => `Me he inscrito en Fly & Grow Sabadell, el congreso aeronáutico universitario de la UAB: miércoles 5 de mayo, 15:00, Campus Sabadell. La entrada es gratuita: ${url}`,
    mapBtn: 'Cómo llegar',
    where: `Escola d'Enginyeria UAB, Carrer dels Emprius 2, 08202 Sabadell\nCómo llegar: ${MAPS}`,
    confirm: {
      subject: 'Inscripción confirmada: Fly & Grow Sabadell, 5 de mayo de 2027',
      preheader: 'Miércoles 5 de mayo, 15:00, Campus Sabadell. Añádelo a tu calendario.',
      title: 'Inscripción confirmada',
      lead: 'Tu plaza en Fly &amp; Grow Sabadell, el 2º Congreso Aeronáutico Universitario de la UAB, está confirmada. La jornada reúne a empresas del sector aeronáutico, ponencias, una mesa redonda con exalumnos y una simulación de control aéreo en directo con IVAO España.',
      calTitle: 'Añádelo a tu calendario',
      gcal: 'Añadir a Google Calendar',
      calNote: 'Si usas Apple Calendar u Outlook, abre el archivo adjunto.',
      progTitle: 'Programa',
      prog: [['15:00', 'Apertura: stands y ponencias'], ['17:30', 'Charlas del sector'], ['19:30', 'Networking y Entrevistas Express'], ['20:30', 'Fin de la jornada']],
      bye: 'Te esperamos el 5 de mayo.',
      intro: 'Tu plaza en Fly & Grow Sabadell, el 2º Congreso Aeronáutico Universitario de la UAB, está confirmada.',
      date: 'Miércoles 5 de mayo de 2027, 15:00',
      calText: 'Añadir a Google Calendar',
      calText2: 'Apple Calendar u Outlook: abre el archivo adjunto.',
    },
    cierre: {
      subject: 'Entrevistas Express: la preinscripción cierra el 25 de abril',
      preheader: 'Crea tu perfil de candidato antes del domingo 25 de abril.',
      title: 'Últimos días para las Entrevistas Express',
      lead: 'La preinscripción a las Entrevistas Express cierra el <b>domingo 25 de abril</b>. Después, las empresas revisan los perfiles y seleccionan a quién entrevistar el día del congreso: sin perfil no es posible optar a una entrevista.',
      btn: 'Crear mi perfil',
      note: 'Si ya lo has creado, no tienes que hacer nada más.',
      bye: 'Mucha suerte.',
    },
    semana: {
      subject: 'Queda una semana: Fly & Grow Sabadell, 5 de mayo',
      preheader: 'El miércoles 5 de mayo a las 15:00 te esperamos en el Campus Sabadell.',
      title: 'Queda una semana',
      lead: 'El miércoles 5 de mayo a las 15:00 comienza Fly &amp; Grow Sabadell en el Campus Sabadell. Te recomendamos revisar el programa para organizar tu tarde.',
      bye: 'Te esperamos el próximo miércoles.',
    },
    dia: {
      subject: 'Este miércoles: Fly & Grow Sabadell, 15:00, Campus Sabadell',
      preheader: "Miércoles 5 de mayo a las 15:00 en la Escola d'Enginyeria de la UAB, Campus Sabadell.",
      title: 'Te esperamos el miércoles',
      lead: "Este miércoles 5 de mayo a las 15:00 comienza Fly &amp; Grow Sabadell en la Escola d'Enginyeria de la UAB. Puedes asistir durante toda la tarde, a la hora que mejor te convenga.",
      tipsTitle: 'Información práctica',
      tips: ['Si participas en las Entrevistas Express, lleva un par de copias impresas de tu CV.', 'Los stands se encuentran en el hall de la planta -1.', 'Las ponencias tienen lugar en el Aula 12; la apertura es a las 15:00.'],
      bye: 'Hasta el miércoles.',
    },
    encuesta: {
      subject: 'Gracias por asistir a Fly & Grow Sabadell',
      preheader: 'Dos minutos para ayudarnos a preparar la 3ª edición.',
      title: 'Gracias por asistir',
      lead: 'Gracias por formar parte de la 2ª edición de Fly &amp; Grow Sabadell. Tu opinión es fundamental para preparar la próxima edición.',
      ask: 'La encuesta dura dos minutos: qué te ha resultado más útil, qué mejorarías y qué empresas te gustaría encontrar el próximo año.',
      btn: 'Responder la encuesta',
      bye: 'Muchas gracias.',
    },
  },
  ca: {
    privacy: 'Política de privacitat',
    board: [['Data', 'DC 05 MAI 2027'], ['Hora', '15:00'], ['Lloc', 'Campus Sabadell']],
    hello: (n) => `Hola, ${n}:`,
    footer: "Reps aquest correu perquè t'has inscrit a flyandgrow.es. Per a qualsevol consulta, pots respondre directament aquest missatge.",
    photoAlt: 'Equip organitzador de la 1a edició de Fly & Grow Sabadell',
    sign: '<b>Organització de Fly &amp; Grow Sabadell</b>',
    signText: 'Organització de Fly & Grow Sabadell',
    speedTitle: 'Últim pas per a les Entrevistes Express',
    speedText: "Crea el teu perfil de candidat amb el teu correu UAB abans del 25 d'abril. Les empreses seleccionen a qui entrevistar abans del congrés: sense perfil no és possible optar a una entrevista.",
    speedBtn: 'Crear el meu perfil',
    progBtn: 'Veure el programa complet',
    invTitle: 'Convida els teus companys',
    invText: "Comparteix el teu enllaç personal. Si s'hi inscriuen tres persones, participaràs en el sorteig de premis de Fly &amp; Grow Sabadell.",
    invBtn: 'Compartir per WhatsApp',
    invWa: (url) => `M'he inscrit a Fly & Grow Sabadell, el congrés aeronàutic universitari de la UAB: dimecres 5 de maig, 15:00, Campus Sabadell. L'entrada és gratuïta: ${url}`,
    mapBtn: 'Com arribar-hi',
    where: `Escola d'Enginyeria UAB, Carrer dels Emprius 2, 08202 Sabadell\nCom arribar-hi: ${MAPS}`,
    confirm: {
      subject: 'Inscripció confirmada: Fly & Grow Sabadell, 5 de maig de 2027',
      preheader: 'Dimecres 5 de maig, 15:00, Campus Sabadell. Afegeix-ho al teu calendari.',
      title: 'Inscripció confirmada',
      lead: "La teva plaça a Fly &amp; Grow Sabadell, el 2n Congrés Aeronàutic Universitari de la UAB, està confirmada. La jornada reuneix empreses del sector aeronàutic, ponències, una taula rodona amb exalumnes i una simulació de control aeri en directe amb IVAO Espanya.",
      calTitle: 'Afegeix-ho al teu calendari',
      gcal: 'Afegir a Google Calendar',
      calNote: 'Si fas servir Apple Calendar o Outlook, obre el fitxer adjunt.',
      progTitle: 'Programa',
      prog: [['15:00', 'Obertura: estands i ponències'], ['17:30', 'Xerrades del sector'], ['19:30', 'Networking i Entrevistes Express'], ['20:30', 'Fi de la jornada']],
      bye: "T'esperem el 5 de maig.",
      intro: 'La teva plaça a Fly & Grow Sabadell, el 2n Congrés Aeronàutic Universitari de la UAB, està confirmada.',
      date: 'Dimecres 5 de maig de 2027, 15:00',
      calText: 'Afegir a Google Calendar',
      calText2: 'Apple Calendar o Outlook: obre el fitxer adjunt.',
    },
    cierre: {
      subject: "Entrevistes Express: la preinscripció tanca el 25 d'abril",
      preheader: "Crea el teu perfil de candidat abans de diumenge 25 d'abril.",
      title: 'Últims dies per a les Entrevistes Express',
      lead: "La preinscripció a les Entrevistes Express tanca <b>diumenge 25 d'abril</b>. Després, les empreses revisen els perfils i seleccionen a qui entrevistar el dia del congrés: sense perfil no és possible optar a una entrevista.",
      btn: 'Crear el meu perfil',
      note: "Si ja l'has creat, no cal que facis res més.",
      bye: 'Molta sort.',
    },
    semana: {
      subject: 'Queda una setmana: Fly & Grow Sabadell, 5 de maig',
      preheader: "Dimecres 5 de maig a les 15:00 t'esperem al Campus Sabadell.",
      title: 'Queda una setmana',
      lead: 'Dimecres 5 de maig a les 15:00 comença Fly &amp; Grow Sabadell al Campus Sabadell. Et recomanem revisar el programa per organitzar la teva tarda.',
      bye: "T'esperem dimecres vinent.",
    },
    dia: {
      subject: 'Aquest dimecres: Fly & Grow Sabadell, 15:00, Campus Sabadell',
      preheader: "Dimecres 5 de maig a les 15:00 a l'Escola d'Enginyeria de la UAB, Campus Sabadell.",
      title: "T'esperem dimecres",
      lead: "Aquest dimecres 5 de maig a les 15:00 comença Fly &amp; Grow Sabadell a l'Escola d'Enginyeria de la UAB. Pots assistir durant tota la tarda, a l'hora que et vagi millor.",
      tipsTitle: 'Informació pràctica',
      tips: ['Si participes a les Entrevistes Express, porta un parell de còpies impreses del teu CV.', 'Els estands són al hall de la planta -1.', "Les ponències tenen lloc a l'Aula 12; l'obertura és a les 15:00."],
      bye: 'Fins dimecres.',
    },
    encuesta: {
      subject: 'Gràcies per assistir a Fly & Grow Sabadell',
      preheader: 'Dos minuts per ajudar-nos a preparar la 3a edició.',
      title: 'Gràcies per assistir',
      lead: 'Gràcies per formar part de la 2a edició de Fly &amp; Grow Sabadell. La teva opinió és fonamental per preparar la propera edició.',
      ask: "L'enquesta dura dos minuts: què t'ha resultat més útil, què milloraries i quines empreses t'agradaria trobar l'any vinent.",
      btn: "Respondre l'enquesta",
      bye: 'Moltes gràcies.',
    },
  },
};

function confirmacion({ nombre, speedcheck, lang: lg, codigo }) {
  const l = lang(lg); const s = S[l]; const t = s.confirm;
  const n = escapeHtml(firstName(nombre));
  // enlace personal de invitacion (el codigo lo calcula store.codigo a partir del email)
  const refUrl = codigo ? `https://flyandgrow.es/${l === 'ca' ? 'ca/' : ''}?ref=${codigo}` : '';
  const invite = refUrl ? `
      ${h2(s.invTitle)}
      <p style="margin:0 0 10px">${s.invText}</p>
      <p style="margin:0 0 10px;font-family:${MONO};font-size:14px;background:#F1F4F7;border:1px solid ${C.line};border-radius:3px;padding:10px 12px;word-break:break-all">${refUrl}</p>
      <p style="margin:0">${button(`https://wa.me/?text=${encodeURIComponent(s.invWa(refUrl))}`, s.invBtn, C.green, '#ffffff')}</p>` : '';
  const prog = t.prog.map(([h, a]) => `
        <tr><td style="padding:9px 0;border-top:1px solid ${C.line};font-family:${MONO};font-weight:700;color:${C.ink};width:64px;vertical-align:top">${h}</td>
            <td style="padding:9px 0;border-top:1px solid ${C.line}">${a}</td></tr>`).join('');
  const content = `
      <p style="margin:0 0 6px">${s.hello(n)}</p>
      <p style="margin:0 0 20px">${t.lead}</p>
      ${board(s.board)}
      ${speedcheck ? greenBox(s.speedTitle, s.speedText, `${BASE}/entrevistas`, s.speedBtn) : ''}
      ${h2(t.calTitle)}
      <p style="margin:0 0 10px">${button(GCAL[l], t.gcal)}</p>
      <p style="margin:0;font-size:14px;color:${C.soft}">${t.calNote}</p>
      ${h2(t.progTitle)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${BODY};font-size:15px;color:#2B3A4A">${prog}</table>
      <p style="margin:16px 0 0">${button(`${home(l)}#programa`, s.progBtn)}&nbsp; ${outline(MAPS, s.mapBtn)}</p>
      ${invite}
      <p style="margin:26px 0 0">${t.bye}<br>${s.sign}</p>`;
  const html = layout({ lang: l, preheader: t.preheader, photo: 'equipo.jpg', photoAlt: s.photoAlt, title: t.title, content, footer: s.footer, privacy: s.privacy });
  const text = [
    s.hello(firstName(nombre)), t.intro, `${t.date}\n${s.where}`,
    speedcheck ? `${s.speedTitle}: ${s.speedText}\n${BASE}/entrevistas` : '',
    `${t.calText}: ${GCAL[l]}\n${t.calText2}`,
    `${s.progBtn}: ${home(l)}#programa`,
    refUrl ? `${s.invTitle}: ${s.invText.replace(/&amp;/g, '&')}\n${refUrl}` : '',
    `${t.bye}\n${s.signText}`,
  ].filter(Boolean).join('\n\n');
  return { subject: t.subject, html, text };
}

// recordatorios y encuesta: tipo = 'semana' | 'dia' | 'encuesta'
function recordatorio({ nombre, speedcheck, lang: lg, tipo }) {
  const l = lang(lg); const s = S[l]; const t = s[tipo];
  if (!t) throw new Error(`tipo de recordatorio desconocido: ${tipo}`);
  const n = escapeHtml(firstName(nombre));
  let content = `<p style="margin:0 0 6px">${s.hello(n)}</p><p style="margin:0 0 20px">${t.lead}</p>`;
  const text = [s.hello(firstName(nombre)), t.lead.replace(/&amp;/g, '&')];
  if (tipo === 'cierre') {
    content += `<p style="margin:0 0 10px">${button(`${BASE}/entrevistas`, t.btn, C.green, '#ffffff')}</p><p style="margin:0;font-size:14px;color:${C.soft}">${t.note}</p>`;
    text.push(`${BASE}/entrevistas\n${t.note}`);
  } else if (tipo === 'semana') {
    content += board(s.board);
    content += `<p style="margin:20px 0 0">${button(`${home(l)}#programa`, s.progBtn)}&nbsp; ${outline(MAPS, s.mapBtn)}</p>`;
    text.push(`${s.progBtn}: ${home(l)}#programa\n${s.where}`);
  } else if (tipo === 'dia') {
    content += board(s.board) + h2(t.tipsTitle)
      + `<ul style="margin:0;padding-left:20px">${t.tips.map((x) => `<li style="margin:4px 0">${x}</li>`).join('')}</ul>`
      + `<p style="margin:18px 0 0">${button(MAPS, s.mapBtn)}&nbsp; ${outline(`${home(l)}#programa`, s.progBtn)}</p>`;
    text.push(t.tips.map((x) => `- ${x}`).join('\n'), `${s.where}\n${s.progBtn}: ${home(l)}#programa`);
  } else {
    content += `<p style="margin:0 0 16px">${t.ask}</p><p style="margin:0">${button(`${BASE}/encuesta`, t.btn, C.green, '#ffffff')}</p>`;
    text.push(`${t.ask}\n${BASE}/encuesta`);
  }
  content += `<p style="margin:26px 0 0">${t.bye}<br>${s.sign}</p>`;
  text.push(`${t.bye}\n${s.signText}`);
  const photo = tipo === 'encuesta' ? 'equipo.jpg' : 'ponencia.jpg';
  const html = layout({ lang: l, preheader: t.preheader, photo, photoAlt: s.photoAlt, title: t.title, content, footer: s.footer, privacy: s.privacy });
  return { subject: t.subject, html, text: text.join('\n\n') };
}

// ---------- empresas (tratamiento de usted) ----------
const E = {
  es: {
    subject: 'Solicitud recibida: Fly & Grow Sabadell 2027',
    preheader: 'Le responderemos en los próximos días con los detalles para el 5 de mayo de 2027.',
    title: 'Solicitud recibida',
    hello: (c) => `Hola, ${c}:`,
    lead: (e) => `Gracias por su interés en participar en Fly &amp; Grow Sabadell. Hemos recibido la solicitud de <b>${e}</b> y le responderemos en los próximos días con todos los detalles.`,
    board: (p) => [['Paquete', p], ['Fecha', '05 MAY 2027'], ['Lugar', 'Campus Sabadell']],
    tbd: 'Por decidir',
    next: 'Mientras tanto, puede consultar en nuestra web qué incluye cada servicio. Si desea añadir cualquier información, puede responder directamente a este correo.',
    btn: 'Ver los paquetes',
    bye: 'Un cordial saludo,<br><b>Organización de Fly &amp; Grow Sabadell</b>',
    footer: 'Recibe este correo porque ha enviado una solicitud desde flyandgrow.es/empresas.',
    privacy: 'Política de privacidad',
    photoAlt: 'Ponencia de Aena en la 1ª edición de Fly & Grow Sabadell',
    text: (c, e, p) => `Hola, ${c}:\n\nGracias por su interés en participar en Fly & Grow Sabadell (5 de mayo de 2027, Campus Sabadell de la UAB). Hemos recibido la solicitud de ${e} y le responderemos en los próximos días con todos los detalles.\n\nPaquete: ${p}\n\nSi desea añadir cualquier información, puede responder directamente a este correo.\nPaquetes: ${BASE}/empresas/\n\nUn cordial saludo,\nOrganización de Fly & Grow Sabadell`,
  },
  ca: {
    subject: 'Sol·licitud rebuda: Fly & Grow Sabadell 2027',
    preheader: 'Us respondrem els propers dies amb els detalls per al 5 de maig de 2027.',
    title: 'Sol·licitud rebuda',
    hello: (c) => `Hola, ${c}:`,
    lead: (e) => `Gràcies pel vostre interès a participar a Fly &amp; Grow Sabadell. Hem rebut la sol·licitud de <b>${e}</b> i us respondrem els propers dies amb tots els detalls.`,
    board: (p) => [['Paquet', p], ['Data', '05 MAI 2027'], ['Lloc', 'Campus Sabadell']],
    tbd: 'Per decidir',
    next: "Mentrestant, podeu consultar al nostre web què inclou cada servei. Si voleu afegir-hi qualsevol informació, podeu respondre directament aquest correu.",
    btn: 'Veure els paquets',
    bye: 'Salutacions cordials,<br><b>Organització de Fly &amp; Grow Sabadell</b>',
    footer: 'Rebeu aquest correu perquè heu enviat una sol·licitud des de flyandgrow.es/ca/empresas.',
    privacy: 'Política de privacitat',
    photoAlt: "Ponència d'Aena a la 1a edició de Fly & Grow Sabadell",
    text: (c, e, p) => `Hola, ${c}:\n\nGràcies pel vostre interès a participar a Fly & Grow Sabadell (5 de maig de 2027, Campus Sabadell de la UAB). Hem rebut la sol·licitud de ${e} i us respondrem els propers dies amb tots els detalls.\n\nPaquet: ${p}\n\nSi voleu afegir-hi qualsevol informació, podeu respondre directament aquest correu.\nPaquets: ${BASE}/ca/empresas/\n\nSalutacions cordials,\nOrganització de Fly & Grow Sabadell`,
  },
};

function empresaCopia({ empresa, contacto, paquete, lang: lg }) {
  const l = lang(lg); const t = E[l];
  const p = paquete === 'Por decidir' ? t.tbd : paquete;
  const content = `
      <p style="margin:0 0 6px">${t.hello(escapeHtml(contacto))}</p>
      <p style="margin:0 0 20px">${t.lead(escapeHtml(empresa))}</p>
      ${board(t.board(escapeHtml(p).toUpperCase()))}
      <p style="margin:22px 0 14px">${t.next}</p>
      <p style="margin:0">${button(`${home(l)}empresas/#paquetes`, t.btn)}</p>
      <p style="margin:26px 0 0">${t.bye}</p>`;
  const html = layout({ lang: l, preheader: t.preheader, photo: 'ponencia.jpg', photoAlt: t.photoAlt, title: t.title, content, footer: t.footer, privacy: t.privacy });
  return { subject: t.subject, html, text: t.text(contacto, empresa, p) };
}

module.exports = { confirmacion, recordatorio, empresaCopia };
