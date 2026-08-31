export function makeButton(label: string, title: string, onClick: () => void, className = 'vectora-button'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button'; button.className = className; button.textContent = label;
  button.title = title; button.setAttribute('aria-label', title); button.addEventListener('click', onClick);
  return button;
}
