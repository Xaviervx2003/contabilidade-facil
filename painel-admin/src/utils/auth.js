export const getMatricula = () => 
  sessionStorage.getItem('matricula') || 
  localStorage.getItem('matricula');

export const getUserId = () => 
  sessionStorage.getItem('userId') || 
  localStorage.getItem('userId');

export const getPapel = () =>
  sessionStorage.getItem('papel') ||
  localStorage.getItem('papel') ||
  'aluno';

export const getAlunoMatricula = () => {
  const matricula = getMatricula()?.trim();
  const papel = getPapel();

  if (!matricula || papel === 'admin' || papel === 'professor') {
    return null;
  }

  const matriculaNormalizada = matricula.toLowerCase();
  if (matriculaNormalizada === 'admin' || matriculaNormalizada === 'professor') {
    return null;
  }

  return matricula;
};
