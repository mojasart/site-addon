document.addEventListener("DOMContentLoaded", function () {
  // Inicializar Quill sem o módulo de redimensionamento de imagem
  var quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        ['image', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['link', 'image']
      ]
    }
  });

  // Função para obter o valor de um cookie pelo nome
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // Recupera o nome do usuário do cookie e exibe na página
  const username = getCookie('username');
  const usernameDisplay = document.getElementById('username-display');
  const logoutBtn = document.getElementById('logout-btn');

  if (username) {
    usernameDisplay.innerHTML = `Hello, ${username}!`;
    logoutBtn.style.display = 'inline';
    usernameDisplay.disabled = true;
    usernameDisplay.addEventListener('click', () => {
  window.location.href = '/account/account.html';  // Redireciona para a página da conta do usuário
});
  } else {
    // Se não estiver logado, mantém o botão "Login" funcionando
    usernameDisplay.innerHTML = 'Login';
    logoutBtn.style.display = 'none'; // Esconde o botão de logout

    // Redireciona para a página de login quando clicar em "Login"
    usernameDisplay.addEventListener('click', () => {
      window.location.href = '/index.html';  // Redireciona para a página de login
    });
  }

  // Função para logout
  logoutBtn.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Remove o cookie no frontend
      document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';

      if (response.redirected) {
        window.location.href = response.url;  // Redireciona para a página de login
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  });

  // Função para mostrar o popup com uma mensagem personalizada
  function showPopup(message) {
    const popup = document.getElementById('popup-warning');
    const popupMessage = document.getElementById('popup-message');
    popupMessage.textContent = message;
    popup.style.display = 'flex'; // Mostra o popup
  }

  // Evento para fechar o popup ao clicar no botão
  document.getElementById('close-popup-btn').addEventListener('click', () => {
    document.getElementById('popup-warning').style.display = 'none';
  });

  // Submeter o formulário e garantir que o conteúdo do editor Quill seja enviado
  document.getElementById('submit-addon-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    // Verifique se o usuário está logado e autorizado
    if (!username) {
      showPopup('Você precisa estar logado para criar um addon.');
      return;
    }

    const addonName = document.getElementById('addon-name').value;
    const addonDescription = quill.root.innerHTML; // Pega o conteúdo do Quill
    const addonSimpleDescription = document.getElementById('simple-description').value; // Pega a descrição simples
    const addonCategory = document.getElementById('addon-category').value; // Pega a categoria
    const addonImage = document.getElementById('addon-image').files[0]; // Para upload de arquivo
    const addonFile = document.getElementById('addon-file').files[0]; // Para upload do arquivo .zip ou .mcaddon

    // Verifique se os campos obrigatórios estão preenchidos
    if (!addonName || !addonSimpleDescription || !addonCategory || !addonFile) {
      showPopup('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Definir o limite de tamanho do arquivo (exemplo: 500MB)
    const fileSizeLimit = 500 * 1024 * 1024;
    if (addonFile.size > fileSizeLimit) {
      showPopup('O arquivo é muito grande! Por favor, selecione um arquivo menor que 500MB.');
      return;
    }

    const formData = new FormData();
    formData.append('name', addonName);
    formData.append('description', addonDescription); // Adiciona a descrição detalhada formatada do Quill
    formData.append('simpleDescription', addonSimpleDescription); // Adiciona a descrição simples
    formData.append('category', addonCategory); // Adiciona a categoria
    formData.append('image', addonImage); // Adiciona a imagem
    formData.append('addonFile', addonFile); // Adiciona o arquivo addon

    try {
      const response = await fetch('/submit-addon', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        // Redirecionar ou mostrar mensagem de sucesso
        window.location.href = '/site.html'; // Exemplo de redirecionamento
      } else {
        const error = await response.text();
        console.error('Erro ao criar o addon:', error);
        showPopup('Erro ao criar o addon.');
      }
    } catch (error) {
      console.error('Erro ao enviar o formulário:', error);
      showPopup('Erro ao enviar o formulário.');
    }
  });
});
