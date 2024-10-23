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
const createLink = document.getElementById('create-link');

if (username) {
  // Exibe o nome do usuário se ele estiver logado
  usernameDisplay.innerHTML = `Hello, ${username}!`;
  logoutBtn.style.display = 'inline';
  createLink.style.display = 'block'; // Exibe o link de criação

  // Redireciona para a página de conta ao clicar no nome
  usernameDisplay.addEventListener('click', () => {
      window.location.href = '/account/account.html';  // Redireciona para a página de conta
  });
} else {
  // Caso o usuário não esteja logado, exibe "Login"
  usernameDisplay.innerHTML = 'Login';
  logoutBtn.style.display = 'none';

  // Redireciona para a página de login quando clicar em "Login"
  usernameDisplay.addEventListener('click', () => {
      window.location.href = '/index.html';  // Redireciona para a página de login
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
      try {
          const response = await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
          });

          // Remove o cookie de autenticação
          document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';

          if (response.redirected) {
              window.location.href = response.url;  // Redireciona para a página de login
          }
      } catch (error) {
          console.error('Erro ao fazer logout:', error);
      }
  });
}

const addonId = window.location.pathname.split('/').pop();

// Inicializa o editor Quill
const quill = new Quill('#editor-container', {
  theme: 'snow',
  modules: {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image']
    ]
  }
});

// Função para carregar os dados do addon
async function loadAddonData() {
  try {
    const response = await fetch(`/api/addon/${addonId}`);
    const addon = await response.json();

    // Preenche os campos com os dados do addon
    document.getElementById('addon-name').value = addon.name;
    quill.root.innerHTML = addon.description; // Preenche o editor Quill
    document.getElementById('simple-description').value = addon.simpleDescription;
    document.getElementById('addon-category').value = addon.category;

    // Imagem e arquivo não podem ser pré-carregados, o usuário terá que enviar novos se quiser alterá-los
  } catch (error) {
    console.error('Erro ao carregar os dados do addon:', error);
  }
}

// Chama a função para carregar os dados do addon ao carregar a página
loadAddonData();

// Função para salvar as alterações
document.getElementById('edit-addon-form').addEventListener('submit', async function (event) {
  event.preventDefault(); // Evita o comportamento padrão de recarregar a página

  const addonName = document.getElementById('addon-name').value;
  const addonDescription = quill.root.innerHTML; // Pega o conteúdo do Quill
  const addonSimpleDescription = document.getElementById('simple-description').value;
  const addonCategory = document.getElementById('addon-category').value;

  const formData = new FormData();
  formData.append('name', addonName);
  formData.append('description', addonDescription); // Adiciona a descrição detalhada formatada do Quill
  formData.append('simpleDescription', addonSimpleDescription); // Adiciona a descrição simples
  formData.append('category', addonCategory);

  // Se o usuário enviar novos arquivos, eles serão incluídos
  const addonImage = document.getElementById('addon-image').files[0];
  if (addonImage) {
    formData.append('image', addonImage); // Adiciona a imagem se houver uma nova
  }

  const addonFile = document.getElementById('addon-file').files[0];
  if (addonFile) {
    formData.append('addonFile', addonFile); // Adiciona o arquivo addon se houver um novo
  }

  try {
    const response = await fetch(`/api/addon/${addonId}`, {
      method: 'PUT',
      body: formData,
    });

    if (response.ok) {
      alert('Addon atualizado com sucesso!');
      window.location.href = '/account/account.html'; // Redireciona de volta para a página de conta
    } else {
      alert('Erro ao atualizar o addon');
    }
  } catch (error) {
    console.error('Erro ao salvar as alterações do addon:', error);
  }
});
