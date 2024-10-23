const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const Addon = require('./models/Addon');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const uploadDir = path.join(__dirname, 'uploads');

// Verificar se a pasta 'uploads' existe, caso contrário, criá-la
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Conectado ao MongoDB');
}).catch(err => console.error(err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// Configuração de sessão
app.use(session({
    secret: 'seu_segredo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Configuração do multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
    fieldSize: 500 * 1024 * 1024,
  },
});

// Middleware para verificar autorização
async function isAuthorized(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).send('Você precisa estar logado para criar um addon.');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user || !user.isAuthorized) {
            return res.status(403).send('Você não tem permissão para criar um addon.');
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro interno do servidor');
    }
}

// Configurar nodemailer para enviar emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vatonagevatonage@gmail.com',
    pass: 'xwtp lqnd swoi yipj' // Coloque a senha de aplicativo aqui
  }
});
// Rota para criar um addon
app.post('/submit-addon', isAuthorized, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'addonFile', maxCount: 1 }
]), async (req, res) => {
  const { name, description, simpleDescription, category } = req.body;

  const username = req.session.username;

  try {
    if (!req.files || !req.files.image || !req.files.addonFile) {
      return res.status(400).send('Por favor, envie uma imagem e o arquivo do addon.');
    }

    const imagePath = `uploads/${req.files.image[0].filename}`;
    const addonFilePath = `uploads/${req.files.addonFile[0].filename}`;

    const newAddon = new Addon({
      name,
      description,
      simpleDescription,
      category,
      image: imagePath,
      author: username || 'Anonymous',
      file: addonFilePath
    });

    await newAddon.save();
    res.redirect('/site.html');
  } catch (error) {
    console.error('Erro ao criar addon:', error);
    res.status(500).json({ message: 'Erro ao criar o addon.' });
  }
});

// Rota de registro de usuário com envio de email de verificação
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).send('Usuário já existe.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      verificationToken,
      isVerified: false
    });

    // Enviar o email de verificação via Hotmail
    const verificationLink = `http://localhost:4000/verify-email?token=${verificationToken}`;
    await transporter.sendMail({
      from: 'vatonagevatonage@gmail.com', // O e-mail Hotmail que você configurou
      to: email,
      subject: 'Verify your email!',
      html: `<p>Hello, ${username}, looks like you registered a new account in vatonage addons site, that's awesome! </p>
             <p>Press the link below to verify your account and keep exploring new things:</p>
             <a href="${verificationLink}">Verify email</a>`
    });

    // Salva o usuário após o envio bem-sucedido do e-mail
    await newUser.save();

    res.status(201).send('User registred successfully, go back to the site now!');
  } catch (error) {
    console.error('Erro ao registrar usuário e enviar email:', error);
    res.status(500).send('Erro ao registrar e enviar o email de verificação.');
  }
});


// Rota de verificação de email
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).send('Token inválido ou expirado.');
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Remove o token após verificação
    await user.save();

    res.send('User registred successfully, go back to the site now!');
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).send('Erro ao verificar email.');
  }
});

// Rota de login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    
    // Verifica se o usuário existe e a senha está correta
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('User or password do not match.');
    }

    // Verifica se o email foi confirmado
    if (!user.isVerified) {
      return res.status(403).send('Please check your email.');
    }

    // Se passar por todas as verificações, faz o login
    req.session.userId = user._id;
    req.session.username = user.username;

    res.cookie('username', user.username, {
      httpOnly: false,
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect('/site.html');
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).send('Erro ao fazer login.');
  }
});

// ... o restante do código permanece igual.


// Rota para buscar os detalhes do addon pelo ID
// Rota para visualizar um addon específico
// Rota para visualizar um addon específico e incrementar visualizações
app.get('/addon/:id', async (req, res) => {
  try {
    const addon = await Addon.findById(req.params.id);
    if (!addon) {
      return res.status(404).send('Addon não encontrado');
    }

    // Incrementar o contador de visualizações
    addon.views += 1;
    await addon.save();

    // Calcule `totalPages` e `currentPage` se necessário (ajuste conforme sua lógica)
    const totalPages = 1; // Isso é um exemplo, ajuste conforme necessário
    const currentPage = 1; // Também ajustável conforme sua lógica de paginação

    // Renderize a página do addon, passando todas as variáveis necessárias
    res.render('addon', {
      addon,
      totalPages,
      currentPage
    });
  } catch (error) {
    console.error('Erro ao buscar addon:', error);
    res.status(500).send('Erro ao buscar o addon.');
  }
});

// Rota para gerenciar likes
// Rota para gerenciar likes
// Rota para gerenciar likes
app.post('/addon/:id/like', async (req, res) => {
  const addonId = req.params.id;

  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const addon = await Addon.findById(addonId);
    if (!addon) {
      return res.status(404).json({ message: 'Addon não encontrado.' });
    }

    const userId = req.session.userId;
    const hasLiked = addon.likedBy.includes(userId.toString());

    if (hasLiked) {
      addon.likes -= 1;
      addon.likedBy = addon.likedBy.filter(id => id.toString() !== userId);
      await addon.save();
      return res.json({ likes: addon.likes, message: 'Like Removed.' });
    } else {
      addon.likes += 1;
      addon.likedBy.push(userId);
      await addon.save();
      return res.json({ likes: addon.likes, message: 'Like Added.' });
    }
  } catch (error) {
    console.error('Erro ao gerenciar likes:', error);
    res.status(500).json({ message: 'Erro ao gerenciar likes.' });
  }
});



// Rota de logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erro ao fazer logout.');
        }

        res.clearCookie('username');
        res.clearCookie('connect.sid');
        res.redirect('/index.html');
    });
});

// Rota para buscar addons criados pelo usuário logado
app.get('/api/user-addons', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'User is not logged' });
  }

  try {
    const addons = await Addon.find({ author: req.session.username });
    res.json(addons);
  } catch (error) {
    console.error('Erro ao buscar addons do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar addons do usuário' });
  }
});

// Rota para editar um addon específico criado pelo usuário
app.get('/edit-addon/:id', isAuthenticated, async (req, res) => {
  try {
    const addon = await Addon.findOne({ _id: req.params.id, author: req.session.username });
    if (!addon) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este addon' });
    }

    res.render('edit', { addon });
  } catch (error) {
    console.error('Erro ao buscar addon para edição:', error);
    res.status(500).json({ message: 'Erro ao buscar addon para edição' });
  }
});

// Rota para salvar alterações no addon
app.post('/edit-addon/:id', isAuthenticated, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'addonFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, simpleDescription, category } = req.body;
    const addon = await Addon.findOne({ _id: req.params.id, author: req.session.username });

    if (!addon) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este addon' });
    }

    addon.name = name || addon.name;
    addon.description = description || addon.description;
    addon.simpleDescription = simpleDescription || addon.simpleDescription;
    addon.category = category || addon.category;

    if (req.files && req.files.image) {
      addon.image = `uploads/${req.files.image[0].filename}`;
    }

    if (req.files && req.files.addonFile) {
      addon.file = `uploads/${req.files.addonFile[0].filename}`;
    }

    await addon.save();
    res.redirect('/account/account.html');
  } catch (error) {
    console.error('Erro ao editar addon:', error);
    res.status(500).json({ message: 'Erro ao editar o addon' });
  }
});

// Middleware para verificar se o usuário está logado
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  } else {
    res.redirect('/index.html');
  }
}

// Protege a rota da conta do usuário
app.get('/account/account.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'account', 'account.html'));
});

// Rota para buscar addons com filtragem por categoria
// Rota para buscar addons com filtragem por categoria
// Rota para buscar addons com filtragem por categoria e ordenação
app.get('/api/addons', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const category = req.query.category || '';
  const sortBy = req.query.sortBy || 'recent'; // Padrão: ordenar por mais recente

  try {
    let query = {};
    if (category) {
      query.category = category;
    }

    let sortCriteria;
    if (sortBy === 'downloads') {
      sortCriteria = { downloads: -1 };
    } else if (sortBy === 'likes') {
      sortCriteria = { likes: -1 };
    } else {
      // Ordenação por data de criação (mais recente)
      sortCriteria = { createdAt: -1 };
    }

    const totalAddons = await Addon.countDocuments(query);
    const totalPages = Math.ceil(totalAddons / limit);

    // Ordena com base no campo especificado
    const addons = await Addon.find(query, 'name simpleDescription category image downloads author likes createdAt')
      .sort(sortCriteria) // Ordena com base no critério selecionado
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ addons, totalPages, currentPage: page });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar addons' });
  }
});

// Rota para download do addon
app.get('/download/:id', async (req, res) => {
  try {
    const addon = await Addon.findById(req.params.id);

    if (!addon) {
      return res.status(404).send('Addon não encontrado.');
    }

    addon.downloads += 1;
    await addon.save();

    res.download(addon.file);
  } catch (error) {
    console.error('Erro ao baixar o addon:', error);
    res.status(500).send('Erro ao baixar o addon.');
  }
});

// Rota para a raiz
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// Servir arquivos estáticos
app.use(express.static('login'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/create-an-addon', express.static(path.join(__dirname, 'create-an-addon')));
app.use(express.static('pagina do addon'));
app.use('/account', express.static(path.join(__dirname, 'account')));
app.use('/edit', express.static(path.join(__dirname, 'edit')));
app.use('/uploads', express.static('uploads'));
app.get('/create.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'create-an-addon', 'create.html'));
})
app.get('/script-create.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'create-an-addon', 'script-create.js'));
app.get('/style-create.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'create-an-addon', 'style-create.css'));
  });
});
// Iniciar o servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
