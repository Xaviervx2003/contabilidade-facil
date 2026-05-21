import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';

export const useLogin = () => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // O data.dados contém id, nome, matricula, papel, token, etc.
      if (data.sucesso && data.dados?.token) {
        sessionStorage.setItem('token', data.dados.token);
        sessionStorage.setItem('usuario', JSON.stringify(data.dados));
      }
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: authService.register,
  });
};

export const useVerificarIdentidade = () => {
  return useMutation({
    mutationFn: authService.verificarIdentidade,
  });
};

export const useRedefinirSenha = () => {
  return useMutation({
    mutationFn: authService.redefinirSenha,
  });
};
