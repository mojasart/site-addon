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

// Carrossel Automático
let currentIndex = 0;
const items = document.querySelectorAll('.carousel-item');
const dots = document.querySelectorAll('.dot');
const totalItems = items.length;

function showImage(index) {
  items.forEach((item, i) => {
      item.classList.remove('active');
      dots[i].classList.remove('active');
  });

  items[index].classList.add('active');
  dots[index].classList.add('active');
  currentIndex = index;
}

function showNextImage() {
  let nextIndex = (currentIndex + 1) % totalItems;
  showImage(nextIndex);
}

setInterval(showNextImage, 5000);

// Controle dos Dots
dots.forEach(dot => {
  dot.addEventListener('click', (event) => {
      const index = event.target.getAttribute('data-index');
      showImage(Number(index));
  });
});

// Filtro de Pesquisa
function filterAddons() {
  const searchInput = document.getElementById('search-input').value.toLowerCase().trim();  
  const addons = document.querySelectorAll('.addon-card');

  addons.forEach((addon) => {
      const addonTitle = addon.querySelector('h3').textContent.toLowerCase();
      const addonSummary = addon.querySelector('.addon-summary').textContent.toLowerCase();
      
      if (addonTitle.includes(searchInput) || addonSummary.includes(searchInput)) {
          addon.style.display = 'block';
      } else {
          addon.style.display = 'none';
      }
  });
}

// Evento de clique no botão de pesquisa
document.getElementById('search-btn').addEventListener('click', filterAddons);

// Evento de pressionar a tecla "Enter" no campo de pesquisa
document.getElementById('search-input').addEventListener('keyup', (event) => {
  if (event.key === 'Enter') {
      filterAddons();
  }
});

// Dropdown de Categorias
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("categories-btn").addEventListener("click", function() {
      const dropdown = document.getElementById("categories-dropdown");
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  });
});

// Função para carregar os addons com base no critério de ordenação
// Função para carregar os addons com base no critério de ordenação
// Função para carregar os addons com base no critério de ordenação e categoria
async function loadAddons(page = 1, sortBy = 'recent', category = '') {
  try {
    const response = await fetch(`/api/addons?page=${page}&sortBy=${sortBy}&category=${category}`);
    const data = await response.json();

    const addonsList = document.querySelector('.addons-list');
    addonsList.innerHTML = '';  // Limpa a lista antes de carregar os novos addons

    data.addons.forEach(addon => {
      // Criando um novo elemento usando o template
      const addonCard = document.createElement('div');
      addonCard.classList.add('addon-card');

      // Criando o HTML do addon card diretamente
      addonCard.innerHTML = `
        <a href="/addon/${addon._id}">
          <div class="addon-bg" style="background-image: url('/${addon.image}')"></div>
        </a>
        <div class="addon-card-content">
          <div class="addon-header">
            <h3>${addon.name}</h3>
            <span class="downloads">${addon.downloads || 0} Downloads</span>
          </div>
          <p>By ${addon.author || 'Anonymous'}</p>
          <p class="addon-summary">${addon.simpleDescription}</p>
          <div class="addon-likes">
            <button class="like-btn" data-id="${addon._id}"><i class="fas fa-thumbs-up"></i> Like</button>
            <span class="like-count">${addon.likes || 0}</span>
          </div>
        </div>
      `;

      addonsList.appendChild(addonCard);
    });

    updatePagination(data.totalPages, data.currentPage, sortBy); // Atualiza a paginação com a ordenação escolhida

    // Adiciona eventos aos botões de like após carregar
    setupLikeButtons();
  } catch (error) {
    console.error('Erro ao carregar addons:', error);
  }
}

function isUserLoggedIn() {
  const username = getCookie('username'); // Função já existente para obter o cookie do nome de usuário
  return !!username; // Retorna true se o usuário estiver logado, caso contrário false
}
// Função para configurar os botões de like
// Função para configurar os botões de like
// Função para configurar os botões de like
// Função para configurar os botões de like
function setupLikeButtons() {
  const likeButtons = document.querySelectorAll('.like-btn');
  likeButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      if (!isUserLoggedIn()) {
        // Exibe um alerta e redireciona para a página de login se o usuário não estiver logado
        alert('Você precisa estar logado para dar um like.');
        window.location.href = '/index.html'; // Redireciona para a página de login
        return; // Interrompe a execução caso o usuário não esteja logado
      }

      const addonId = event.currentTarget.getAttribute('data-id');

      if (!addonId) {
        console.error('ID do addon não encontrado no botão de like.');
        return;
      }

      try {
        const response = await fetch(`/addon/${addonId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 401) {
          // Redireciona para login se o usuário não estiver autenticado
          alert('Você precisa estar logado para curtir.');
          window.location.href = '/index.html';
          return;
        }

        const data = await response.json();
        if (data.message) {
          const likeCountElement = button.nextElementSibling;
          let currentLikes = parseInt(likeCountElement.textContent);

          // Verifica se o valor de likes é um número válido
          if (isNaN(currentLikes)) {
            currentLikes = 0;
          }

          if (data.message === 'Like Added.') {
            likeCountElement.textContent = currentLikes + 1;
            button.innerHTML = '<i class="fas fa-thumbs-down"></i> Unlike'; // Atualiza para "Unlike"
          } else if (data.message === 'Like Removed.') {
            likeCountElement.textContent = currentLikes - 1 >= 0 ? currentLikes - 1 : 0; // Impede valores negativos
            button.innerHTML = '<i class="fas fa-thumbs-up"></i> Like'; // Atualiza para "Like"
          }
        }
      } catch (error) {
        console.error('Erro ao gerenciar likes:', error);
      }
    });
  });
}

// Inicializar os botões de like ao carregar a página
document.addEventListener('DOMContentLoaded', setupLikeButtons);





// Função para atualizar a paginação
function updatePagination(totalPages, currentPage, sortBy = 'recent') {
  const paginationContainer = document.querySelector('.pagination');
  paginationContainer.innerHTML = ''; // Limpa o container de paginação

  for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.classList.add('page-button');

      if (i === currentPage) {
          pageButton.classList.add('active'); // Destaca a página atual
      }

      // Evento de clique para mudar de página
      pageButton.addEventListener('click', () => {
          loadAddons(i, sortBy); // Chama a função de carregar addons com base na página clicada
      });

      paginationContainer.appendChild(pageButton);
  }
}

// Inicializar ao carregar a página
loadAddons(1, 'recent');

// Evento para alterar a ordenação quando o dropdown for mudado
document.getElementById('sort-dropdown').addEventListener('change', (event) => {
  const sortBy = event.target.value;
  loadAddons(1, sortBy);
});
