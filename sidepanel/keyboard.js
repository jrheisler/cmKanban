document.addEventListener('keydown', (e) => {
  const search = document.getElementById('search')
  if(e.key === '/' && document.activeElement !== search){
    e.preventDefault()
    search?.focus()
  }
})
