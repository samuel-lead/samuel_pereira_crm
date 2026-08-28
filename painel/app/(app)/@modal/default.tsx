// Obrigatório existir pro slot paralelo "@modal": quando a rota atual não é
// a interceptada (ex.: acabou de abrir /leads normal, sem pop-up), o Next
// precisa de algo pra renderizar nesse slot — nada, nesse caso.
export default function ModalPadrao() {
  return null;
}
