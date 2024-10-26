function showTab(tabName) {
  // Esconder todas as abas
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";  // Esconde todas as abas
  }

  // Remover a classe "active" de todos os botões
  tablinks = document.getElementsByTagName("button");
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Mostrar a aba atual
  document.getElementById(tabName).style.display = "block";  // Mostra o conteúdo da aba clicada
  event.currentTarget.className += " active";  // Adiciona a classe "active" ao botão clicado
}

// Quando a página carregar, mostrar a aba de descrição por padrão
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("description").style.display = "block";
});
document.getElementById('login-link').addEventListener('click', function() {
  window.location.href = 'login/index.html'; // Redireciona para a página de login
});