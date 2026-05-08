export const getMatricula = () => 
  sessionStorage.getItem('matricula') || 
  localStorage.getItem('matricula');

export const getUserId = () => 
  sessionStorage.getItem('userId') || 
  localStorage.getItem('userId');
