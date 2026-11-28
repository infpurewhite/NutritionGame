/** Spanish string table. Must define exactly the keys of `en.ts`. */
import type { StringKey } from './en.ts';

export const es: Readonly<Record<StringKey, string>> = {
  'app.title': 'Plato Andino',
  'app.prototype': 'Prototipo',
  'app.prototypeNotice':
    'Prototipo: este contenido aún no ha sido revisado por un nutricionista.',
  'app.disclaimer':
    'Para investigación y enseñanza; no es un consejo dietético ni médico.',
  'nav.play': 'Jugar',
  'nav.about': 'Acerca de y créditos',
  'lang.label': 'Idioma',

  'scenario.heading': 'Reto de hoy',

  'foods.heading': 'Alimentos',
  'foods.portion': 'Una porción: {grams} g, {state}',
  'foods.state.cooked': 'cocido',
  'foods.state.uncooked': 'sin cocer',
  'foods.proxyNote':
    'Valor proxy: el alimento de la fuente es parecido, no exactamente este cultivo.',
  'foods.add': 'Agregar una porción de {food}',
  'foods.remove': 'Quitar una porción de {food}',
  'foods.onPlate': '{count} en el plato',
  'foods.locked.heading': 'Próximamente',
  'foods.locked.unverified': 'Valores pendientes de verificación',
  'foods.locked.no_values': 'Aún sin valores nutricionales',
  'foods.locked.no_portion': 'Porción pendiente de fuente',

  'plate.heading': 'Tu plato',
  'plate.empty': 'Agrega porciones para armar tu plato.',
  'plate.item': '{count} × {food}',
  'plate.clear': 'Vaciar el plato',

  'score.heading': 'Puntaje',
  'score.overall': '{score} de 100',
  'score.overallNone': 'Aún sin puntaje',
  'score.amount': '{amount} de {target} {unit}',
  'score.amountNoData': 'sin datos (meta: {target} {unit})',
  'score.partial': 'Solo cuenta los alimentos con datos. Sin datos para: {foods}.',
  'score.excluded':
    'Ningún alimento del plato tiene datos de este nutriente, por eso no entra en el puntaje.',

  'nutrient.energy': 'Energía',
  'nutrient.protein': 'Proteína',
  'nutrient.fibre': 'Fibra',
  'nutrient.iron': 'Hierro',
  'nutrient.calcium': 'Calcio',

  'verdict.short': 'Falta',
  'verdict.on_target': 'En la meta',
  'verdict.over': 'De más',
  'verdict.no_data': 'Sin datos',

  'about.heading': 'Acerca de y créditos',
  'about.dataset.heading': 'Datos de alimentos',
  'about.dataset.body': '{name}, versión {version}.',
  'about.dataset.basis':
    'Los valores son por 100 g de porción comestible en estado crudo. El juego los convierte a porciones tal como se comen.',
  'about.targets.heading': 'Metas nutricionales',
  'about.targets.body':
    'Ingestas diarias de referencia para: {profile}. Esta comida se evalúa con el {share} % de ellas.',
  'about.targets.perDay': '{amount} {unit} por día',
  'about.mealShare.source': 'Fuente de la proporción de la comida (un supuesto):',
  'about.portions.heading': 'Porciones',
  'about.portions.body':
    'Los tamaños de porción y los factores de rendimiento por cocción son supuestos. Cada uno tiene su fuente. Se asume que los nutrientes se conservan por completo al cocinar.',
  'about.portions.row': '{food}: {grams} g {state}, factor de rendimiento {yield}',
  'about.portions.servingSource': 'Tamaño de porción:',
  'about.portions.yieldSource': 'Factor de rendimiento:',
  'about.provenance.heading': 'Origen de las metas y las porciones',
  'about.provenance.body':
    'Las ingestas de referencia, los tamaños de porción y el escenario están copiados de la versión A de este juego, con sus citas. No se han contrastado de forma independiente con las fuentes originales.',
  'about.licence.heading': 'Licencias',
  'about.licence.body': 'Código: MIT. Contenido y textos del juego: CC BY 4.0.',
};
