import { connectToDatabase } from '../../utils/mongodb'; // Exemplo de função que conecta ao banco

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, password } = req.body;
    
    // Lógica de autenticação
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ email });
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Autenticação bem-sucedida
      return res.status(200).json({ message: 'Login successful' });
    } catch (error) {
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
