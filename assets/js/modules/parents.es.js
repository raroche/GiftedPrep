/**
 * parents.es.js — La Guía para Padres, en español.
 *
 * Traducción completa de parents.js, no un resumen. Florida tiene una población
 * hispanohablante grande, y el CogAT llega a leerse en voz alta en español en
 * los grados 1 y 2, así que una versión corta habría sido peor que ninguna.
 *
 * El español es neutro y latinoamericano, con "usted" implícito evitado a favor
 * del tuteo, que suena más cercano leyéndolo en casa.
 */

import { escapeHtml } from './charts.js';

const callout = (kind, title, body) => `
  <div class="gp-callout gp-callout--${kind}">
    <p class="gp-callout__title">${title}</p>
    ${body}
  </div>`;

const day = (n, title, body) => `
  <div class="gp-timeline__item">
    <span class="gp-timeline__day">${n}</span>
    <div class="gp-timeline__body">
      <h3>${title}</h3>
      ${body}
    </div>
  </div>`;

const acc = (q, a) => `
  <details class="gp-accordion">
    <summary class="gp-accordion__trigger">${q}</summary>
    <div class="gp-accordion__panel">${a}</div>
  </details>`;

export function renderParentGuideEs(manifest) {
  const total = (manifest?.categories || [])
    .reduce((n, c) => n + Object.values(c.counts || {}).reduce((a, b) => a + b, 0), 0);

  const gradeRows = (manifest?.grades || []).map((g) => `
    <tr>
      <td><strong>Grado ${g.n}</strong></td>
      <td>${escapeHtml(g.cogat).replace('Level', 'Nivel')}</td>
      <td>${escapeHtml(g.nnat).replace('Level', 'Nivel')}</td>
      <td>${escapeHtml(g.olsat).replace('Level', 'Nivel')}</td>
      <td>${g.reading ? 'El niño lee' : 'Se lee en voz alta, solo dibujos'}</td>
    </tr>`).join('');

  return `
<p class="gp-page-lede">
  Esta es la parte del sitio escrita para ti, no para tu hijo. Explica qué son
  estas pruebas, qué dice la investigación sobre prepararse para ellas, y un plan
  tranquilo para la semana anterior. Es deliberadamente honesta sobre dónde la
  evidencia es débil.
</p>

${callout('info', 'La versión corta',
  `<p>Familiarizarse ayuda un poco. Estudiar mucho ayuda menos de lo que la gente
   cree, cuesta más de lo que se espera, y lo único que la investigación muestra
   claramente que hace daño es un padre ansioso haciendo ejercicios todos los
   días. Muéstrale a tu hijo los tipos de pregunta una vez para que nada lo
   sorprenda, protege su sueño, mantén tu propia cara tranquila esa mañana, y
   luego suéltalo.</p>`)}

<h2>Qué son estas pruebas</h2>

<p>
  Los distritos de Florida hacen una prueba grupal corta para identificar niños
  para programas de superdotados, y luego mandan a los que pasan esa puerta a una
  evaluación individual completa con un psicólogo escolar. La prueba grupal es
  solo una puerta. No es la prueba que decide nada.
</p>

<p>
  No existe una sola prueba de Florida. Cada distrito escoge la suya, y la mayoría
  no le dice a los padres cuál es. Las tres más comunes en el país son el
  <strong>CogAT</strong>, el <strong>NNAT</strong> y el <strong>OLSAT</strong>, y
  este sitio cubre las tres, con ${total.toLocaleString('es')} preguntas en total.
</p>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>Grado</th><th>CogAT</th><th>NNAT</th><th>OLSAT</th><th>Cómo se aplica</th></tr></thead>
  <tbody>${gradeRows}</tbody>
</table>
</div>

${callout('caution', 'El salto entre segundo y tercer grado',
  `<p>Las tres pruebas cambian de carácter entre segundo y tercer grado. Los
   dibujos pasan a ser palabras y números. Cuatro opciones pasan a ser cinco. Y el
   CogAT deja de ser sin límite de tiempo y marcado por el maestro, y pasa a diez
   minutos exactos por sección. Un niño al que segundo grado le pareció fácil
   puede encontrar tercero genuinamente difícil, y no ha pasado nada malo.</p>`)}

<h2>Qué exige Florida realmente</h2>

<p>
  La elegibilidad la fija la Regla 6A-6.03019 de la Junta Estatal de Educación.
  Bajo el <strong>Plan A</strong>, el niño debe cumplir las tres cosas:
</p>

<ol>
  <li>Un puntaje <strong>dos desviaciones estándar por encima del promedio</strong>
      en una prueba de inteligencia aplicada individualmente. En un WISC-V eso es
      <strong>130</strong>.</li>
  <li>La mayoría de las características de los estudiantes superdotados, según una
      lista del distrito que cubre aprendizaje, motivación, creatividad y
      liderazgo.</li>
  <li>Evidencia de necesidad de un programa de instrucción especial.</li>
</ol>

<p>
  Los distritos también pueden tener un <strong>Plan B</strong>, presentado como
  Apéndice C de sus políticas y auditado por el estado. El Plan B normalmente baja
  el requisito intelectual a cerca de <strong>115</strong> para niños de bajos
  ingresos o que están aprendiendo inglés.
</p>

<h3>Qué usan de verdad los veinte distritos más grandes de Florida</h3>

<p>
  Las reglas de cada distrito están presentadas ante el estado, y ya se leyeron
  las de los veinte más grandes. El patrón:
</p>

<ul>
  <li><strong>El NNAT es con mucho el más común</strong> — nueve de los veinte usan
      una prueba de Naglieri. Lee ya pasó al más nuevo <strong>NGAT</strong> y
      Miami-Dade menciona el <strong>NGAT-NV</strong>, así que la Prueba General de
      Habilidad de Naglieri parece estar reemplazando al NNAT3 en Florida.</li>
  <li><strong>Segundo grado es el año de la evaluación</strong> en once distritos.
      Miami-Dade evalúa en <strong>primer grado</strong>.</li>
  <li><strong>El puntaje mínimo para pasar varía una desviación estándar completa</strong>,
      desde <strong>107</strong> en Duval hasta <strong>122</strong> en Manatee. Un
      niño que en Duval pasaría a evaluación completa, en Manatee sería rechazado.</li>
  <li><strong>Cinco distritos no publican ninguna prueba grupal.</strong>
      Hillsborough revisa datos que ya tiene, Marion usa una escala de calificación
      del maestro, Sarasota solo evalúa por referencia, y Pasco no publica nada.</li>
  <li><strong>Pasco no tiene Plan B</strong>, así que las familias allí no tienen
      ninguna vía con requisito reducido.</li>
</ul>

${callout('caution', 'Cuatro distritos limitan cuántas veces se puede evaluar a un niño',
  `<p>Esta es la regla que puede tomar por sorpresa a una familia, y es el único
   tipo de regla sobre evaluación que publica algún distrito de Florida.</p>
   <ul>
     <li><strong>St. Johns</strong> — el CogAT y el KBIT-2R se pueden tomar
         <strong>una sola vez en toda la carrera escolar K-12</strong>.</li>
     <li><strong>Sarasota</strong> — no la misma prueba en 12 meses, y se
         desaconseja más de tres evaluaciones en toda la escuela.</li>
     <li><strong>Manatee</strong> — evaluar con una prueba puede impedir que se use
         una prueba relacionada más adelante para la elegibilidad.</li>
     <li><strong>Osceola</strong> — referencia para evaluación como máximo una vez
         al año.</li>
   </ul>
   <p>Si estás en uno de esos distritos, vale la pena saberlo antes de pedir una
   nueva evaluación. En los demás no se publica ningún límite.</p>`)}

<p>
  <strong>Ningún distrito de Florida en el estudio publica declaración alguna sobre
  la preparación para la prueba.</strong> Ninguno la respalda, la desaconseja ni la
  prohíbe.
</p>

${callout('tip', 'Averigua qué hace tu propio distrito',
  `<p>Las reglas de cada distrito son públicas. Busca en el repositorio de
   políticas del Departamento de Educación de Florida en
   <a href="https://beessgsw.org/#/spp/institution/public/" rel="noopener">beessgsw.org</a>,
   abre tu distrito, y lee la Parte III y el Apéndice C. O simplemente pregunta al
   coordinador de superdotados o de ESE en la escuela de tu hijo qué prueba usan y
   cuál es el puntaje mínimo.</p>`)}

<h2>¿Practicar realmente ayuda?</h2>

<p>Sí, un poco, y mucho menos de lo que sugiere el internet. Los números honestos:</p>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>Qué</th><th>Efecto</th><th>Fuente</th></tr></thead>
  <tbody>
    <tr><td>Hacer una prueba parecida una vez antes</td><td><strong>0.27 DE</strong>, unos 4 puntos de CI</td><td>Scharfen y Holling 2018, 122 estudios</td></tr>
    <tr><td>Una segunda repetición</td><td>0.15 DE</td><td>igual</td></tr>
    <tr><td>Una tercera repetición</td><td>0.10 DE</td><td>igual</td></tr>
    <tr><td>Orientación breve al formato</td><td>el <strong>menor</strong> de todos los efectos</td><td>Bangert-Drowns y col. 1983</td></tr>
    <tr><td>Ejercicios repetidos y extensos</td><td>el <strong>mayor</strong> efecto</td><td>igual</td></tr>
  </tbody>
</table>
</div>

<p>
  Lee esa tabla dos veces. La ganancia está <strong>concentrada al principio</strong>:
  casi toda ocurre en la primera exposición y baja rápido. Y la parte que es
  éticamente cómoda, mostrarle al niño el formato, es también la parte con el
  efecto más pequeño.
</p>

<p>
  Hay otra trampa. Las ganancias por entrenamiento son en gran medida
  <em>específicas de la prueba</em>. No son ganancias en razonamiento. Así que un
  puntaje entrenado exagera la capacidad que el programa le va a exigir a tu hijo
  todos los días.
</p>

${callout('info', 'Lo que dice la propia editorial del CogAT',
  `<p>Riverside Insights, que publica el CogAT, es inusualmente directa. Su
   preocupación no es que los niños se preparen. Es que la preparación está
   <strong>distribuida de forma desigual</strong>, se correlaciona con el ingreso
   familiar, y reduce la diversidad en los programas de superdotados. Su solución
   no es prohibir la práctica sino <em>igualarla</em>, dándole a cada niño los
   materiales oficiales gratuitos.</p>`)}

<h2>La línea entre familiarizarse y estudiar de más</h2>

<div class="gp-table-scroll">
<table>
  <thead><tr><th>Familiarizarse — está bien, poco rendimiento</th><th>Estudiar de más — donde empiezan los problemas</th></tr></thead>
  <tbody>
    <tr><td>Ver cada tipo de pregunta una vez para que nada sea nuevo</td><td>Repetir muchos ejercicios de cada tipo</td></tr>
    <tr><td>Practicar cómo responder: tocar, no saltarse preguntas</td><td>Enseñar reglas para resolver matrices</td></tr>
    <tr><td>Practicar escuchar instrucciones habladas</td><td>Memorizar tipos de pregunta o preguntas filtradas</td></tr>
    <tr><td>Una sesión corta, y parar</td><td>Un curso de preparación de varias semanas</td></tr>
    <tr><td>Explicar que algunas preguntas van a ser demasiado difíciles</td><td>Entrenar hacia un puntaje meta</td></tr>
  </tbody>
</table>
</div>

<h2>Lo único que no deberías saltarte</h2>

${callout('caution', 'Un padre ansioso más ejercicios frecuentes es la combinación que hace daño',
  `<p>Maloney y colegas (2015, <em>Psychological Science</em>) estudiaron a 438
   niños de primer y segundo grado. Los hijos de padres con ansiedad matemática
   aprendieron <strong>significativamente menos</strong> durante el año escolar y
   terminaron con más ansiedad propia — <strong>pero solo cuando esos padres
   ayudaban con frecuencia con la tarea</strong>. Cuando los padres ansiosos
   ayudaban menos, no hubo ningún efecto.</p>
   <p>La transmisión fue emocional, no informativa: se mantuvo incluso
   controlando cuántas matemáticas sabían los padres. Si esta prueba te tiene
   tenso, la evidencia dice que lo más útil que puedes hacer es <em>menos</em>, no
   más.</p>`)}

<p>
  Hay un segundo hallazgo que vale la pena conocer. En los primeros grados, los
  niños con <strong>mayor memoria de trabajo</strong> son justo aquellos cuyo
  rendimiento más se derrumba bajo ansiedad (Ramirez y col., 2016). La presión que
  aplicas cae con más fuerza exactamente sobre el niño que esperas que salga bien.
</p>

<h2>La semana anterior</h2>

<p>
  Este plan se apoya en un hallazgo fuerte: en niños de 7 a 11 años, una diferencia
  <strong>acumulada</strong> de bastante menos de una hora de sueño, repartida en
  varias noches, produjo cambios que <em>maestros que no sabían en qué grupo estaba
  cada niño</em> pudieron notar (Gruber y col., 2012). La semana importa más que la
  noche.
</p>

<div class="gp-timeline">
  ${day(7, 'Fija el horario de sueño. Deja de preparar.', `
    <ul>
      <li>Fija una hora de dormir y una de despertar para toda la semana, fin de
          semana incluido. De 6 a 12 años se necesitan <strong>9 a 12 horas</strong>.</li>
      <li><strong>Deja de enseñar contenido nuevo ahora.</strong> Lo que se podía
          ganar ya está ganado.</li>
      <li>Revisión honesta: si <em>tú</em> te sientes ansioso, este es el momento de
          reducir tu participación, no de aumentarla.</li>
    </ul>`)}

  ${day(6, 'Una sesión de familiarización. Solo una.', `
    <ul>
      <li>Haz una sesión corta en este sitio, o con el material oficial de tu
          distrito. Quince minutos son suficientes.</li>
      <li>Dile a tu hijo explícitamente que <strong>algunas preguntas van a ser
          demasiado difíciles a propósito</strong>, porque la prueba cubre varias
          edades a la vez.</li>
      <li>Practiquen lo mecánico: tocar una respuesta, no dejar preguntas en
          blanco, seguir adelante cuando se atore.</li>
    </ul>`)}

  ${day(5, 'Enseña la respiración con la barriga. No el mismo día.', `
    <ul>
      <li>Cinco minutos, jugando. Una mano en el pecho y otra en la barriga. Que se
          mueva la de abajo. Que la exhalación dure más que la inhalación.</li>
      <li>Dale algo que mirar: un rehilete, una pluma, un peluche sobre la barriga.
          Los niños respiran mejor con algo visual que con una instrucción.</li>
      <li>Enseña la versión que nadie nota: <em>huele la flor, apaga la vela</em>,
          cinco veces.</li>
    </ul>
    <p class="gp-muted">La respiración diafragmática tiene la mejor evidencia entre
    las técnicas de calma para esta edad. Sáltate la respiración en caja: aguantar
    cuatro segundos es incómodo para los niños pequeños.</p>`)}

  ${day(4, 'Que mueva el cuerpo. Enseña apretar y soltar.', `
    <ul>
      <li>Juego activo normal. Parque, bicicleta, correr.</li>
      <li>Robot y luego muñeco de trapo: apretar los puños fuerte, contar hasta
          cinco, soltar. Después hombros hasta las orejas, aguantar, soltar.
          Después arrugar la cara, aguantar, soltar.</li>
    </ul>`)}

  ${day(3, 'Ten la conversación sobre las preocupaciones, una vez.', `
    <ul>
      <li>Pregunta una sola vez, abiertamente: <em>¿hay algo del jueves que te esté
          dando vueltas?</em> Escucha. No sermonees, no resuelvas, no lo vuelvas a
          sacar todos los días.</li>
      <li>Introduce el replanteo. Cuando diga que siente raro el estómago:
          <em>esa sensación rápida es tu cuerpo alistándose — también lo hace antes
          de una fiesta de cumpleaños.</em></li>
    </ul>
    <p class="gp-muted">NO uses el ejercicio popular de "escribe tus
    preocupaciones". El estudio famoso de 2011 detrás de eso no se pudo replicar en
    un estudio preregistrado más grande, y además se probó en adolescentes y
    universitarios, no en niños de siete años.</p>`)}

  ${day(2, 'Quítale la logística de encima a tu hijo.', `
    <ul>
      <li>Confirma la hora, el lugar, el estacionamiento, qué llevar. Anótalo para
          no andar apurado y visiblemente tenso esa mañana — los niños leen muy bien
          las señales no verbales de los padres.</li>
      <li>Deja la ropa lista. Planea un desayuno que ya haya comido y le guste.</li>
    </ul>`)}

  ${day(1, 'La noche anterior: haz menos.', `
    <ul>
      <li><strong>Hoy nada de práctica.</strong> Nada.</li>
      <li>Cena normal, noche normal, hora de dormir normal.
          <strong>No lo mandes a dormir más temprano</strong> — un niño acostado
          despierto una hora está peor que uno en su horario de siempre.</li>
      <li>Pantallas apagadas la última hora.</li>
      <li>Di la frase una vez, y déjalo ahí.</li>
    </ul>
    <p class="gp-muted">Si duerme mal, no te asustes y no dejes que te vea
    asustado. Los estudios que encontraron efectos reales cambiaron el sueño
    durante varias noches. Una noche mala no es eso.</p>`)}
</div>

<h2>La mañana</h2>

<ol>
  <li><strong>Despierten a la hora normal.</strong> Nada de alarma temprana para
      "alistarse".</li>
  <li><strong>Un desayuno que ya haya comido antes.</strong> Desayunar en lugar de
      saltárselo sí ayuda a la atención y la memoria esa misma mañana. Lo que lleve
      adentro está mucho menos establecido de lo que dice el internet: una revisión
      de 45 estudios concluyó que no se pueden sacar conclusiones firmes sobre la
      composición. Lo familiar le gana a lo optimizado.</li>
  <li><strong>Botella de agua. Nada de cafeína.</strong> Los investigadores
      concluyeron que no hay dosis segura establecida para niños ni beneficio
      alguno.</li>
  <li><strong>Nada de repaso de último minuto.</strong> Nada de tarjetas en el
      carro. La ansiedad consume exactamente la memoria de trabajo que la prueba
      mide.</li>
  <li><strong>Revisa tu propia cara y tu voz</strong> antes de revisar las de él.</li>
  <li>Cinco respiraciones lentas juntos en el carro. Una pose de superhéroe boba si
      los hace reír — como ritual, no porque funcione.</li>
  <li><strong>Di la frase</strong>, y deja de hablar de la prueba.</li>
  <li>Lleguen sin prisa, pero no tan temprano que se quede ahí sentado
      preocupándose.</li>
  <li><strong>La despedida, corta y ligera.</strong> Las despedidas largas y
      emotivas señalan peligro.</li>
  <li>Menciona algo común y agradable planeado para después, para que el día tenga
      un final que no sea la prueba.</li>
</ol>

${callout('tip', 'La frase',
  `<p data-style="font-size:var(--gp-text-lg);font-weight:700">
   "Pase lo que pase hoy, nada cambia sobre ti ni sobre nosotros."</p>
   <p>Dila una vez. No la repitas — repetirla convierte el consuelo en evidencia de
   que hay algo de qué preocuparse.</p>`)}

<h2>Qué decir, y qué no</h2>

<p>
  Elogiar a un niño por <em>ser</em> inteligente lo vuelve más frágil cuando las
  cosas se ponen difíciles, no menos. En niños de cinco y seis años, incluso el
  elogio <em>positivo</em> dirigido a quién es produjo más reacciones de impotencia
  que el elogio dirigido a lo que hizo (Kamins y Dweck, 1999).
</p>

<h3>Antes</h3>
<div class="gp-table-scroll">
<table>
  <thead><tr><th>Evita</th><th>Prueba mejor</th></tr></thead>
  <tbody>
    <tr><td>"Eres tan inteligente, esto te va a salir perfecto."</td><td>"Solo intenta cada una. Algunas van a ser difíciles — así está hecha."</td></tr>
    <tr><td>"Esto es muy importante."</td><td>"Es una mañana de rompecabezas. Después vamos a almorzar."</td></tr>
    <tr><td>"No lo vayas a arruinar."</td><td>"Tómate tu tiempo y mira con cuidado."</td></tr>
    <tr><td>"Sé que vas a entrar."</td><td>"Pase lo que pase, estamos bien."</td></tr>
    <tr><td>"¡Acuérdate de todo lo que practicamos!"</td><td>"Ya sabes cómo se ve. Nada te va a sorprender."</td></tr>
    <tr><td>"Tu primo entró a tu edad."</td><td><em>(no digas nada — no introduzcas una comparación)</em></td></tr>
  </tbody>
</table>
</div>

<h3>Después</h3>
<div class="gp-table-scroll">
<table>
  <thead><tr><th>Evita</th><th>Prueba mejor</th></tr></thead>
  <tbody>
    <tr><td>"¿Te fue bien?"</td><td>"¿Cómo se sintió?"</td></tr>
    <tr><td>"¿Cuántas contestaste bien?"</td><td>"¿Cuál fue la parte más divertida?"</td></tr>
    <tr><td>"¿Te pareció fácil?"</td><td>"¿Hubo alguna difícil? Cuéntame."</td></tr>
    <tr><td>"Eres tan inteligente."</td><td>"Seguiste intentando aunque se puso difícil. Eso es lo que me importa."</td></tr>
    <tr><td>"¿Y si no entras?"</td><td><em>(no lo saques — contesta solo si él lo saca)</em></td></tr>
  </tbody>
</table>
</div>

<p><strong>Cuando diga "creo que contesté algunas mal":</strong></p>
<blockquote>Qué bueno — eso quiere decir que la prueba estaba haciendo su trabajo.
Se <em>supone</em> que tenga preguntas demasiado difíciles. Si las hubieras
contestado todas bien, habría sido la prueba equivocada para ti.</blockquote>

<p><strong>Cuando pregunte "¿me fue bien?":</strong></p>
<blockquote>No tengo idea, ¡yo no estaba ahí adentro! ¿Cómo se <em>sintió</em>?</blockquote>
<p class="gp-muted">
  Contesta al sentimiento, no al puntaje. Repasar con él lo que recuerda de la
  prueba le enseña justo el hábito de rumiar del que está hecha la ansiedad.
</p>

<h2>Entender los puntajes</h2>

${acc('¿Qué es un SAS, un NAI o un SAI?', `
  <p>Los tres son el mismo tipo de número: un puntaje en una escala donde
  <strong>100 es exactamente el promedio</strong> y la desviación estándar es
  <strong>16</strong>. El CogAT lo llama Standard Age Score (SAS), el NNAT lo llama
  Naglieri Ability Index (NAI), y el OLSAT lo llama School Ability Index (SAI).</p>
  <p><strong>Importante:</strong> ninguno es comparable con un CI de Wechsler, que
  usa desviación estándar de 15. Un SAS de 132 son exactamente 2 desviaciones;
  un 132 de WISC son 2.13. No los conviertas uno en otro.</p>
  <div class="gp-table-scroll">
  <table>
    <thead><tr><th>Puntaje</th><th>Percentil</th><th>Estanina</th></tr></thead>
    <tbody>
      <tr><td>135 y arriba</td><td>99</td><td>9</td></tr>
      <tr><td>132</td><td>98</td><td>9</td></tr>
      <tr><td>129</td><td>97</td><td>9</td></tr>
      <tr><td>126</td><td>95</td><td>8</td></tr>
      <tr><td>120</td><td>89</td><td>8</td></tr>
      <tr><td>116</td><td>84</td><td>7</td></tr>
      <tr><td>100</td><td>50</td><td>5</td></tr>
    </tbody>
  </table>
  </div>
  <p class="gp-muted">Un percentil <strong>no</strong> es un porcentaje de
  respuestas correctas. El percentil 95 significa que el niño sacó más que el 95%
  de los niños de su edad, no que contestó bien el 95% de las preguntas.</p>`)}

${acc('¿Cuánto dice realmente un solo puntaje?', `
  <p>Menos de lo que sugiere la etiqueta. Lohman y Korb (2006) siguieron a 6,321
  estudiantes y encontraron que solo cerca del <strong>40%</strong> de los niños
  que estaban en el 3% más alto en tercer grado seguían ahí en cuarto — a pesar de
  una prueba extremadamente confiable.</p>
  <p>En el NNAT el error estándar es de unos <strong>6 puntos</strong>, así que un
  intervalo de confianza del 95% es más o menos <strong>±12</strong>. Un niño que
  saca 130 tiene un puntaje verdadero que podría estar entre 118 y 142. Repetir la
  prueba también sube los puntajes unos 3.8 puntos en promedio.</p>
  <p>Este es el mejor argumento posible para tratar un resultado de evaluación como
  una sola pieza de información, que es también la posición publicada de NAGC: una
  sola prueba en un solo momento no debería decidir la identificación.</p>`)}

${acc('¿Qué es un perfil de habilidad del CogAT, como "8B (V+)"?', `
  <p>El <strong>número</strong> es la del medio de las tres estaninas del niño. La
  <strong>letra</strong> describe la forma:</p>
  <ul>
    <li><strong>A</strong> — los tres puntajes son casi igu<strong>A</strong>les.</li>
    <li><strong>B</strong> — uno está por arri<strong>B</strong>a o por de<strong>B</strong>ajo de los otros dos.</li>
    <li><strong>C</strong> — dos puntajes <strong>C</strong>ontrastan: una fortaleza y una debilidad.</li>
    <li><strong>E</strong> — <strong>E</strong>xtremo, con al menos 24 puntos de diferencia.</li>
  </ul>
  <p>No existe la D. El sufijo (V+, Q−, N+) marca la batería que destaca, en
  relación con los <em>propios</em> otros puntajes del niño, no con los de otros
  niños.</p>
  <p>Cerca del <strong>60%</strong> de los niños que sacan puntajes altísimos tienen
  un perfil desigual, y es mucho más probable que tengan una debilidad relativa que
  una fortaleza relativa. Un perfil desigual es normal, no una señal de alarma.</p>`)}

${acc('¿Qué puntaje mínimo va a usar mi distrito?', `
  <p>No hay estándar nacional, y el rango real es enorme. Los ejemplos publicados
  van desde el percentil 81 como disparador (Prince George's County, Maryland)
  hasta un SAS de 132 (Bellevue, Washington). Ohio usa 127-128 en todo el estado.
  Los Ángeles califica a un niño con el percentil 95 en <em>cualquiera</em> de
  Total, Verbal o No verbal.</p>
  <p>Pregunta en tu distrito. Es la única respuesta confiable.</p>`)}

<h2>Cosas que esta guía deliberadamente no afirma</h2>

<p>
  Varios consejos comunes de preparación no sobreviven al contacto con la
  investigación. Se dejaron fuera a propósito:
</p>

<ul>
  <li><strong>"Escribe tus preocupaciones antes de la prueba."</strong> El estudio
      original no se replicó en un estudio preregistrado de alta potencia.</li>
  <li><strong>"Las poses de poder aumentan la confianza y el rendimiento."</strong>
      Las afirmaciones hormonales y de rendimiento no se replican.</li>
  <li><strong>"Un desayuno alto en proteína y bajo en azúcar mejora los
      puntajes."</strong> Las revisiones dicen que no se pueden sacar conclusiones
      firmes sobre la composición del desayuno.</li>
  <li><strong>"El azúcar pone hiperactivo a tu hijo."</strong> Un metaanálisis en
      <em>JAMA</em> de 23 estudios no encontró ningún efecto. El efecto documentado
      fue sobre los <em>padres</em>: mamás a las que se les dijo que su hijo había
      comido azúcar — cuando en realidad recibió placebo — lo calificaron como más
      hiperactivo.</li>
  <li><strong>"El sueño de dos noches antes es el que más importa."</strong> No se
      pudo verificar en la literatura pediátrica.</li>
  <li><strong>Un porcentaje de ansiedad ante exámenes en grados 1 a 4.</strong> No
      existe una cifra defendible.</li>
</ul>

<h2>Fuentes</h2>

<p>
  Las notas completas de investigación, con cada afirmación ligada a su fuente,
  están en la carpeta <code>docs/research/</code> de este proyecto. Las
  principales:
</p>

<ul>
  <li><a href="https://www.riversidedatamanager.com/BalancedManagement/DigitalResources/Baggage_Files/CogAT/CogAT_7_SIG_v.2-1_092220.pdf" rel="noopener">Guía de interpretación del CogAT Forma 7</a> (Lohman, Riverside Insights)</li>
  <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/nnat3/nnat3-manual-levels-a-d.pdf" rel="noopener">Manual del NNAT3, Niveles A-D</a> (Pearson)</li>
  <li><a href="https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/olsat8/olsat8-overview-brochure.pdf" rel="noopener">Alcance y secuencia del OLSAT 8</a> (Pearson)</li>
  <li><a href="https://files.eric.ed.gov/fulltext/EJ746292.pdf" rel="noopener">Lohman y Korb (2006)</a></li>
  <li><a href="https://journals.sagepub.com/doi/abs/10.1177/0956797615592630" rel="noopener">Maloney y col. (2015), ansiedad matemática de los padres</a></li>
  <li><a href="https://jcsm.aasm.org/doi/10.5664/jcsm.5866" rel="noopener">Consenso de la AASM sobre duración del sueño, avalado por la AAP</a></li>
  <li><a href="https://www.nagc.org/identification" rel="noopener">NAGC sobre identificación</a></li>
  <li><a href="https://beessgsw.org/#/spp/institution/public/" rel="noopener">Repositorio de políticas de distritos del DOE de Florida</a></li>
</ul>

${callout('info', 'Una reflexión final',
  `<p>La identificación de superdotados es una puerta hacia un tipo particular de
   escolaridad. No es una medida del valor de tu hijo, ni de su futuro, ni de
   cuánto se le quiere, y la investigación muestra que es mucho menos estable de lo
   que la etiqueta sugiere — cerca de la mitad de los niños que están en lo más
   alto un año no lo están al siguiente. Pase lo que pase, lo más útil que le puedes
   dar a tu hijo esta semana es un padre tranquilo.</p>`)}
`;
}

export default { renderParentGuideEs };
