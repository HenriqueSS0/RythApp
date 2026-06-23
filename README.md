# RythApp 🎵🤖

**RythApp** é um aplicativo desktop que gera mapas rítmicos para o jogo **Rhythia** a partir de arquivos de áudio.

O objetivo do projeto é automatizar parte do processo de criação de mapas, analisando a música e gerando arquivos `.sspm` compatíveis com o jogo. O usuário pode escolher uma música, configurar a dificuldade, selecionar padrões de gameplay e salvar o mapa diretamente na pasta do Rhythia.

![RythApp Cover](/public/tela.png.jpg)

---

## 🎯 O que o app faz?

O RythApp transforma músicas em mapas jogáveis para o Rhythia.

Ele analisa elementos da música como batidas, energia, pausas e intensidade para criar uma sequência de blocos rítmicos. A geração pode ser feita de forma procedural ou com auxílio de Inteligência Artificial, usando a OpenRouter API.

---

## ✨ Funcionalidades

* Geração automática de mapas `.sspm`
* Análise de áudio local
* Configuração de dificuldade por estrelas
* Seleção de padrões como Snakes, Stairs, Jumps, Bursts e Rotations
* Suporte opcional à geração com IA
* Edição de metadados do mapa
* Salvamento direto na pasta do jogo Rhythia
* Interface desktop moderna em dark mode

---

## 📥 Download

O RythApp já possui versão compilada disponível para uso.

Para instalar, acesse a aba **Releases** deste repositório, baixe a versão mais recente e execute o instalador.

Após abrir o app, basta configurar a pasta do Rhythia, selecionar uma música e gerar o mapa.

---

## 🛠️ Tecnologias utilizadas

O projeto foi desenvolvido combinando tecnologias web modernas com uma camada desktop nativa.

### Frontend

* Next.js 14
* React
* TypeScript
* Tailwind CSS
* Lucide Icons

### Desktop

* Tauri
* Rust

### Processamento de áudio

* Web Audio API

### Inteligência Artificial

* OpenRouter API
* Integração com modelos de linguagem
* Manipulação de respostas estruturadas em JSON

---

## 🖥️ Arquitetura do projeto

O RythApp utiliza uma interface web construída com Next.js e React, empacotada como aplicativo desktop através do Tauri.

A análise de áudio acontece localmente no dispositivo do usuário usando a Web Audio API. A camada em Rust/Tauri é responsável pela integração com o sistema operacional, principalmente para acesso controlado aos arquivos e salvamento dos mapas na pasta do jogo.

A IA é usada como recurso opcional para auxiliar na criação de padrões mais criativos e adaptados à estrutura da música.

---

## 🔒 Privacidade

* O áudio é processado localmente no computador do usuário.
* O projeto não utiliza banco de dados próprio para armazenar músicas ou mapas.
* A chave da OpenRouter API fica salva localmente no dispositivo.
* Os arquivos gerados são salvos diretamente na pasta configurada pelo usuário.

---

## 📌 Status

O RythApp está funcional e possui uma versão disponível na aba de **Releases**.

Este projeto foi desenvolvido como parte do meu portfólio, com foco em demonstrar conhecimentos em desenvolvimento frontend, aplicações desktop com Tauri, integração com IA, processamento de áudio e criação de ferramentas voltadas para automação criativa.

---

## 👨‍💻 Autor

Desenvolvido por **Henrique Sartori**.

GitHub: [@HenriqueSS0](https://github.com/HenriqueSS0)
