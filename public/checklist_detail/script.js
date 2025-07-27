document.querySelectorAll('.check-toggle').forEach(box => {
  box.addEventListener('change', async (e) => {
    const itemId = e.target.dataset.id;
    const isChecked = e.target.checked;
    await fetch('/:id/items/:itemId/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, is_checked: isChecked })
    });
    const listItem = e.target.parentElement;
    const span = listItem.querySelector('span');
    span.classList.remove('checked');
    if (isChecked) {
      span.classList.add('checked');
      document.getElementById('completed-items').appendChild(listItem);
    } else {
      document.getElementById('pending-items').appendChild(listItem);
    }
  });
});
