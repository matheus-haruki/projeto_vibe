import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import dotenv from "dotenv";
dotenv.config();

// --- CONFIGURAÇÃO MANUAL DE PORTA (PARA USO LOCAL) ---
// Define uma porta padrão (ex: 3000) para uso local, 
// removendo a lógica de ambiente do Cloud Run.
const PORT = 3000; 

// --- VARIÁVEIS DE AMBIENTE ---
const MONGO_URI = process.env.MONGO; // Mude o nome da variável para MONGO_URI se for o padrão
// Se você está usando MONGO no .env, mantenha 'process.env.MONGO'
// É recomendável renomear para MONGO_URI para clareza

const app = express();

// --- CONFIGURAÇÃO DE UPLOAD E ESTATÍCOS ---
// Configura o diretório de uploads e cria-o se não existir.
const uploadsDir = path.join(process.cwd(),'uploads');
if(!fs.existsSync(uploadsDir))fs.mkdirSync(uploadsDir);

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads',express.static(uploadsDir));

// Não vou incluir a linha abaixo se você não tem uma pasta 'public'
// e não precisa servir arquivos estáticos de lá para uma aplicação frontend.
// app.use(express.static(path.join(process.cwd(),'public'))); 

// --- CONEXÃO COM O MONGODB ---
const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conexão com MongoDB estabelecida com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error.message);
        // Em um ambiente de produção, você pode querer encerrar o processo:
        // process.exit(1); 
    }
};

// --- SCHEMA E MODELO DE EXEMPLO (ASSUMINDO QUE EXISTE) ---
// Este bloco é necessário para que 'Post.find()' funcione. 
// Substitua pelo seu schema real se ele estiver em outro arquivo.
const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);


// --- ROTAS (EXEMPLO) ---
app.get('/api/posts',async(req,res)=>{
 try{
  // Apenas busca posts se a conexão estiver OK
  const posts = await Post.find().sort({createdAt:-1});
  res.json(posts);
 }catch(e){res.status(500).send('Erro ao buscar posts: '+e.message);}
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta http://localhost:${PORT}`);
    });
}

// Conecta ao DB e então inicia o servidor
connectDB().then(startServer);
