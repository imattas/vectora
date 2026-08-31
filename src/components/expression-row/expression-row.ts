export function makeRowOptions(title: string, actions: Array<{ label: string; onClick: () => void }>): HTMLElement {
  const menu = document.createElement('div'); menu.className = 'row-options'; menu.hidden = true;
  const wrap = document.createElement('div'); wrap.className = 'row-options-wrap';
  const closeMenu = () => {
    menu.hidden = true;
    if (menu.parentElement !== wrap) {
      menu.removeAttribute('style');
      wrap.append(menu);
    }
  };
  for (const action of actions) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = action.label;
    button.addEventListener('click', () => { closeMenu(); action.onClick(); }); menu.append(button);
  }
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'row-options-trigger';
  trigger.textContent = '⋮'; trigger.title = title; trigger.setAttribute('aria-label', title);
  trigger.addEventListener('click', e => {
    e.stopPropagation();
    if (!menu.hidden) { closeMenu(); return; }
    const rect = trigger.getBoundingClientRect();
    document.body.append(menu);
    menu.hidden = false;
    menu.style.position = 'fixed';
    menu.style.top = `${Math.round(rect.bottom + 4)}px`;
    menu.style.left = `${Math.round(Math.min(rect.right - 112, window.innerWidth - 120))}px`;
    menu.style.right = 'auto';
  });
  menu.addEventListener('click', e => e.stopPropagation());
  wrap.append(trigger, menu); return wrap;
}
