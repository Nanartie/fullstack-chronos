import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';
import {setHash, generateToken, findUser, saveUser} from './utils.js'
import db from './db.js'

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const postFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'post_files/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});


const uploadAvatar = multer({ storage: avatarStorage });
const uploadPostFile = multer({ storage: postFileStorage });

const router = express.Router();

const app = express();
const PORT = process.env.PORT || 3000;
const secretKey = generateToken();
console.log("Секретный ключ: " + secretKey);


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/post_files', express.static('post_files'));


const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	service: 'gmail',
	auth: {
		user: 'usof.propaganda@gmail.com',
		pass: 'ftfn zdhe dbit fkep'
	}
});


async function checkUserAccessAdminComment(userId, commentId, res) {
  try {
    const user = await findUser(`id = ${userId}`);
    if (!user) {
      return false
    }

    const [author] = await db.promise().query('SELECT author_id FROM comments WHERE id = ?', [commentId]);
    const [authorProfileToken] = await db.promise().query('SELECT profile_token FROM users WHERE id = ?', [author[0].author_id]);
    const [userRole] = await db.promise().query('SELECT role FROM users WHERE id = ?', [userId]);
    
    if (authorProfileToken[0].profile_token !== user.profile_token && userRole[0].role !== 'admin') {
      return false
    }

    return true;
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    return false;
  }
}


async function checkUserAccessAdminPost(userId, postId, res) {
  try {
    const user = await findUser(`id = ${userId}`);
    if (!user) {
      return false;
    }

    const [author] = await db.promise().query('SELECT author_id FROM posts WHERE id = ?', [postId]);
    const [authorProfileToken] = await db.promise().query('SELECT profile_token FROM users WHERE id = ?', [author[0].author_id]);
    const [userRole] = await db.promise().query('SELECT role FROM users WHERE id = ?', [userId]);
    
    if (authorProfileToken[0].profile_token !== user.profile_token && userRole[0].role !== 'admin') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    return false;
  }
}

async function checkUserAccessPost(userId, postId, res) {
  try {
    const user = await findUser(`id = ${userId}`);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const [author] = await db.promise().query('SELECT author_id FROM posts WHERE id = ?', [postId]);
    const [authorProfileToken] = await db.promise().query('SELECT profile_token FROM users WHERE id = ?', [author[0].author_id]);
    
    if (authorProfileToken[0].profile_token !== user.profile_token) {
      return res.status(403).json({ message: 'Недостаточно прав' });
    }

    return true;
  } catch (error) {
    console.error('Ошибка проверки доступа:', error);
    res.status(500).json({ message: 'Произошла ошибка проверки доступа' });
    return false;
  }
}


app.post('/api/auth/register', async (req, res) => {
 const { login, email, password, password_confirmation } = req.body;

 try {
  const existingUser = await findUser(`login = '${login}' OR email = '${email}'`);
  if (existingUser) {
   return res.status(400).json({ message: 'User with such username or email already exist' });
  }
  if(password_confirmation != password) {
   return res.status(400).json({ message: 'Passwords does not match' });
  }
  const hashedPass = setHash(password); 
  const newUser = await saveUser(login, email, hashedPass);
  const confirmToken = generateToken();
  await db.promise().query(
   'UPDATE users SET confirm_token = ? WHERE id = ?',
   [confirmToken, newUser.id]
  );
  const mailOptions = {
   from: 'chronos.propaganda@gmail.com',
   to: email,
   subject: 'chronos: Email confirmation',
   text: `Click on the following link to confirm email: http://localhost:3001/confirm/${confirmToken}`
  };
  transporter.sendMail(mailOptions, (error, info) => {
   if (error) {
    console.error('Email not sent:', error);
   } else {
    console.log('Email sent: ' + info.response);
   }
  });
  await db.promise().query('INSERT INTO calendars (name, date) VALUES ("Personal", NOW())');
     const [calendar] = await db.promise().query('SELECT LAST_INSERT_ID() AS id');
     await db.promise().query('INSERT INTO usercalendars (userId, calendarId) VALUES (?, ?)', [newUser.id, calendar[0].id]);
  res.status(200).json({ message: 'Registration successfull' });
 } catch (error) {
  console.error('Error during registration:', error);
  res.status(500).json({ message: 'Error during registration' });
 }
});

app.get('/api/auth/confirm/:token', async (req, res) => {
	const { token } = req.params;
	try {
		const [result, _] = await db.promise().query(`SELECT * FROM users WHERE confirm_token = ?`, [token]);
		if (result.length === 0) {
			return res.status(400).send({ message: 'Invalid token' });
		}

		const userId = result[0].id;
		await db.promise().query('UPDATE users SET confirmed = 1, confirm_token = NULL WHERE id = ?', [userId]);

		return res.status(200).send({ message: 'Email successfully confirmed' });
	} catch (error) {
		console.error('Error during email confirmation:', error);
		res.status(500).json({ message: 'Error during email confirmation' });
	}
});


app.post('/api/auth/password-reset', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await findUser(`email = '${email}' AND confirmed = 1`);
        if (!user) {
            return res.status(400).json({ message: 'User with email address not found or email not verified' });
        } else {

        const confirmToken = generateToken();

        await db.promise().query(
            'UPDATE users SET confirm_token = ? WHERE id = ?',
            [confirmToken, user.id]
        );

        const mailOptions = {
            from: 'chronos.propaganda@gmail.com',
            to: email,
            subject: 'chronos: Password reset',
            text: `Click on the following link to reset your password: http://localhost:3001/reset-password/${confirmToken}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error durind sending the email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(200).json({ message: 'A password reset link has been sent to your email' });
	}
    } catch (error) {
        console.error('An error occurred while recovering your password:', error);
        res.status(500).json({ message: 'An error occurred while recovering your password' });
    }
});

app.post('/api/auth/password-reset/:token', async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    try {
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        const [result, _] = await db.promise().query(`SELECT * FROM users WHERE confirm_token = ?`, [token]);
        if (result.length === 0) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        const userId = result[0].id;
        const hashedPass = setHash(newPassword);

        await db.promise().query('UPDATE users SET password = ?, confirm_token = NULL WHERE id = ?', [hashedPass, userId]);

        return res.status(200).json({ message: 'Password successfully reset' });
    } catch (error) {
        console.error('Error during password reset:', error);
        res.status(500).json({ message: 'Error during password reset' });
    }
});



app.post('/api/auth/login', async (req, res) => {
	const { username, password } = req.body;

	try {
		const user = await findUser(`login = '${username}' OR email = '${username}'`);
		if (!user || !bcrypt.compareSync(password, user.password)) {
			return res.status(400).json({ message: 'Passwords do not match' });
		}

		if (!user.confirmed) {
			return res.status(400).json({ message: 'Email not confirmed' });
		}
		
		
		const payload = {
			userId: user.id,
			username: user.login,
		};
		const options = {
			expiresIn: '24h',
		};

		const jwtToken = jwt.sign(payload, secretKey, options);
		
		res.status(200).json({ message: 'Authorization success', user: { userId: user.id, jwtToken: jwtToken } });
	} catch (error) {
		console.error('Error during the authorization:', error);
		res.status(500).json({ message: 'Error during the authorization' });
	}
});

app.post('/api/auth/logout', async (req, res) => {
	try {
    	const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Token not found' });
		}

    	const token = authHeader.split(' ')[1];

		try {
			const decoded = verifyToken(token);
			const userId = decoded.userId;
			
			const user = await findUser(`id = ${userId}`);
			if (!user) {
			return res.status(404).json({ message: 'User not found' });
			}

			return res.status(200).json({ message: 'Logout user' });
		} catch (error) {
			console.error('Error during logout user:', error);
			return res.status(401).json({ message: 'Error during the  logout user' });
		}
	} catch (error) {
		console.error('Error during logout user:', error);
		return res.status(500).json({ message: 'Error during the logout user' });
	}
});

app.get('/api/users', async (req, res) => {
	try {
		const [users, _] = await db.promise().query(`SELECT id, login, full_name, email, avatar FROM users`);
		const filteredUsers = users.filter(user => user.full_name !== 'Deleted user');

    	res.status(200).json(filteredUsers);
	} catch (error) {
		console.error('Ошибка во время получения списка пользователей: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения списка пользователей'});
	}
});

app.get('/api/categories/:categoryId', async (req, res) => {
	const categoryId = req.params.categoryId;
	try {
		const [category, _] = await db.promise().query(`SELECT * FROM categories WHERE id = ?`, [categoryId]);
		
		res.status(200).json(category[0]);
	} catch (error) {
		console.error('Ошибка во время получения категории: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения категории'});
	}
});

app.delete('/api/:calendarID/users', async (req, res) => {
	try {
		const calendarId = req.params.calendarID;
		const userId = req.body.userId;
		const authHeader = req.headers.authorization;
	
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);

		try{
			const sql = `DELETE FROM usercalendars WHERE calendarId = ? AND userId = ?`;

			await db.promise().query(sql, [calendarId, userId]);

			return res.status(200).json({ message: 'User deleted from calendar successfully' });
		} catch (error) {
			console.error('Error deleting user from calendar:', error);
			res.status(500).json({ error: 'Error deleting user from calendar' });
		}
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
});


app.post('/api/:calendarID/users', async (req, res) => {
	try {
	  const calendarId = req.params.calendarID;
	  const userId = req.body.userId;
	
	  const sql = `INSERT INTO usercalendars (userId, calendarId, isOwner) VALUES (?, ?, false)`;
  
	  await db.promise().query(sql, [userId, calendarId]);
  
	  return res.status(200).json({ message: 'Data in db successfully updated' });
	} catch (error) {
	  console.error('Error during editing usercalendars:', error);
		res.status(500).json({ error: 'Error during editing usercalendars' });
	}  
  });



  app.get('/api/:calendarID/available-users', async (req, res) => {
	try {
	  const calendarId = req.params.calendarID;
	  const sql = `SELECT * FROM usercalendars WHERE calendarId = ?`;
	  const [usersInCalendars] = await db.promise().query(sql, [calendarId]);
	  const sqlUsrs = `SELECT * FROM users`;
	  const [users] = await db.promise().query(sqlUsrs);
	  const filteredUsers = users.filter(user => user.full_name !== 'Deleted user');
	  const availableUsers = filteredUsers.filter(user => {
		return !usersInCalendars.some(calendarUser => calendarUser.userId == user.id);
	  });
	  return res.status(200).json(availableUsers);
	} catch (error) {
	  console.error('Error during editing usercalendars:', error);
	  res.status(500).json({ error: 'Error during editing usercalendars' });
	}  
  });
  

  app.get('/api/:calendarID/users/:currentUserId', async (req, res) => {
	try {
	  const calendarId = req.params.calendarID;
	  const currentUserId = req.params.currentUserId;
	
	  const sql = `SELECT isOwner FROM usercalendars WHERE userId = ? AND calendarId = ?`;
	  const [result] = await db.promise().query(sql, [currentUserId, calendarId]);
	
	  if (result.length > 0) {
		const isOwner = result[0].isOwner;
		if (isOwner === 1) { 
			return res.status(200).json({isOwner: true });
		} else {
			return res.status(200).json({isOwner: false });
		}
	  } else {
		return res.status(404).json({ error: 'Запись не найдена' });
	  }
	} catch {
	  console.error('Ошибка проверки владельца календаря:', error);
		res.status(500).json({ error: 'Ошибка проверки владельца календаря' });
	}  
  });
  
app.get('/api/:calendarID/userslist', async (req, res) => {
  try {
    const calendarId = req.params.calendarID;
  
    const sql = `SELECT userId FROM usercalendars WHERE calendarId = ?`;
    const [userlistRows] = await db.promise().query(sql, [calendarId]);
    
    if (userlistRows.length > 0) {
      const userIds = userlistRows.map(row => row.userId);
      
      const sql2 = `SELECT id, login, full_name, email, avatar FROM users WHERE id IN (?)`;
      const [userRows] = await db.promise().query(sql2, [userIds]);
      
      return res.status(200).json({ users: userRows });
    } else {
      return res.status(404).json({ error: 'Список пользователей для календаря пуст' });
    }
  } catch (error) {
    console.error('Ошибка при получении списка пользователей для календаря:', error);
    res.status(500).json({ error: 'Ошибка при получении списка пользователей для календаря' });
  }  
});


app.delete('/api/categories/:categoryId', async (req, res) => {
	const categoryId = req.params.categoryId;
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}
		try{
			await db.promise().query('DELETE FROM post_categories WHERE category_id = ?', [categoryId])
			await db.promise().query('DELETE FROM categories WHERE id = ?', [categoryId])
			res.status(200).json({message: 'Категория успешно удалена'});
		}  catch (error) {
			console.error('Ошибка во время удаления категории: ', error);
			return res.status(500).json({message: 'Произошла ошибка во время удаления категории'});
		}
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.patch('/api/categories/:categoryId', async (req, res) => {
	const categoryId = req.params.categoryId;
	const {title, description} = req.body;
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
				
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}
		
		if(title === '' || description === '' || title === null || description === null){
			return res.status(404).json({message: 'Все поля должны быть заполнены'})
		}
		
		try{
			await db.promise().query('UPDATE categories SET title = ?, description = ? WHERE id = ?', [title, description,categoryId])
			res.status(200).json({message: 'Категория успешно обновлена'});
		}catch (error) {
			console.error('Ошибка обновления категории:', error);
			res.status(500).json({ message: 'Произошла ошибка при обновлении категории' });
		}
		
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.post('/api/users', async (req, res) => {
	const authHeader = req.headers.authorization;
	const { login, email, password, passwordConfirm, role } = req.body;


	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
			
			
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}

		try {
			const existingUser = await findUser(`login = '${login}' OR email = '${email}'`);
			if (existingUser) {
				return res.status(400).json({ message: 'Пользователь с таким именем или email уже существует' });
			}
			if(passwordConfirm != password) {
				return res.status(400).json({ message: 'Пароли не совпадают!' });
			}
			const hashedPass = setHash(password); 
			const [dataUser, _] = await db.promise().query(
			'INSERT INTO users (login, email, password, role, confirmed) VALUES (?, ?, ?, ?, ?)',
			[login, email, hashedPass, role, 1]
			);
			res.status(200).json({ message: 'Пользователь создан успешно' });
		}catch (error) {
			console.error('Ошибка регистрации:', error);
			res.status(500).json({ message: 'Произошла ошибка при регистрации' });
		}
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
	
});

app.post('/api/categories', async (req, res) => {
	const authHeader = req.headers.authorization;
	const { title, description } = req.body;


	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Токен не найден' });
	}
	try {
		const token = authHeader.split(' ')[1];
		
		const decoded = verifyToken(token);
		const userId = decoded.userId;
		
		const user = await findUser(`id = '${userId}'`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
			
			
		if (user.role !== 'admin') {
			return res.status(403).json({ message: 'Недостаточно прав' });
		}

		try {
			const [dataCategory, _] = await db.promise().query(
			'INSERT INTO categories (title, description) VALUES (?, ?)',
			[title, description]
			);
			res.status(200).json({ message: 'Категория успешно создана' });
		}catch (error) {
			console.error('Ошибка регистрации:', error);
			res.status(500).json({ message: 'Произошла ошибка при регистрации' });
		}
	} catch (error) {
		console.error('Ошибка регистрации:', error);
		res.status(401).json({ message: 'Недействительный токен' });
	}
	
});

app.get('/api/categories', async (req, res) =>{
	try {
		const [categories, _] = await db.promise().query('SELECT * FROM categories');
		res.status(200).json(categories);
	} catch (error) {
		console.error('Ошибка во время получения списка категорий: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения списка категорий'});
	}
});

app.get('/api/calendars', async (req, res) =>{
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Токен не найден' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const userId = decoded.userId;
        const [calendars, _] = await db.promise().query('SELECT * FROM usercalendars WHERE userId = ?', [userId]);
        const calendarIds = calendars.map(calendar => calendar.calendarId);
        const calendarsInfo = await db.promise().query('SELECT * FROM calendars WHERE id IN (?)', [calendarIds]);

		//console.log(calendarsInfo);
        res.status(200).json(calendarsInfo);
    } catch (error) {
        console.error('Ошибка во время получения списка календарей: ', error);
        return res.status(500).json({message: 'Произошла ошибка во время получения списка календарей'});
    }
});

app.get('/api/mycalendar/:calendarId', async (req, res) => {
	const calendarId = req.params.calendarId;
	
	try {
		const [eventsIds, _] = await db.promise().query('SELECT eventId FROM calendarevents WHERE calendarId = ?',
			[calendarId]
		);

		const eventsData = [];
		for (const { eventId } of eventsIds) {
			const [eventData, __] = await db.promise().query('SELECT * FROM events WHERE id = ?',
			  [eventId]
			);
			eventsData.push(eventData[0]);
		}
		res.status(200).json(eventsData);
	} catch (error) {
		console.error('Ошибка во время получения данных публикации: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения данных публикации'});
	}
});

app.get('/api/profilevents/:userId', async (req, res) => {
		try {
	const userId = req.params.userId;
	const user = await findUser(`id = '${userId}'`);
	const authHeader = req.headers.authorization;
	const token = authHeader.split(' ')[1];
	const decoded = verifyToken(token);
	

		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		const jwtUserProfileToken = decoded.profileToken;
		if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
			return res.status(403);
		}
		if (userId != decoded.userId) {
			return res.status(403);
		}

		const [eventsIds, _] = await db.promise().query('SELECT eventId FROM userevents WHERE userId = ?',
			[userId]
		);

		const eventsData = [];
		for (const { eventId } of eventsIds) {
			const [eventData, __] = await db.promise().query('SELECT * FROM events WHERE id = ?',
			  [eventId]
			);
			eventsData.push(eventData[0]);
		}
		res.status(200).json(eventsData);
	} catch (error) {
		console.error('Ошибка во время получения данных публикации: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения данных публикации'});
	}
});

app.get('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
	const [user, _] = await db.promise().query(`SELECT id, login, full_name, email, avatar FROM users WHERE id = ${userId}`);
    if (!user[0]) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json(user[0]);
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    return res.status(500).json({ message: 'Произошла ошибка при получении данных пользователя' });
  }
});



const verifyToken = (token) => {
  try {
    return jwt.verify(token, secretKey);
  } catch (err) {
    console.error('Ошибка проверки токена:', err);
    throw new Error('Недействительный токен');
  }
};


app.get('/api/admins/:userId', async (req, res) => {
	try{
		const { userId } = req.params;
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const user = await findUser(`id = '${userId}'`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
			
			
			if (user.role !== 'admin') {
				return res.status(403).json({ message: 'Недостаточно прав' });
			}

			return res.status(200).json(user);
		} catch (error) {
			console.error('Ошибка получения данных пользователя:', error);
			return res.status(500).json({ message: 'Произошла ошибка при получении данных пользователя' });
		}
	} catch(error) {
		console.error('Ошибка при получении данных пользователя:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});


const updateUser = async (userId, fullName, login, email) => {
  await db.promise().query('UPDATE users SET full_name = ?, login = ?, email = ? WHERE id = ?', [fullName, login, email, userId]);
};

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, login } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
    }

    const token = authHeader.split(' ')[1];
	const decoded = verifyToken(token);
    try {
      

      const user = await findUser(`id = '${userId}'`);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      const jwtUserProfileToken = decoded.profileToken;
      if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
      }

      if (!email || !login) {
        return res.status(400).json({ message: 'Пожалуйста, предоставьте данные для обновления' });
      }

      await updateUser(userId, fullName, login, email);

      return res.status(200).json({ message: 'Данные пользователя успешно обновлены' });
    } catch (error) {
      return res.status(500).json({ message: 'Произошла ошибка при обновлении данных пользователя' });
    }
  } catch (error) {
		console.error('Ошибка при обновлении данных пользователя:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
  }
});


app.post('/api/users/edit', async (req, res) => {
	try {
		const {userId, profileToken} = req.body;
		const authHeader = req.headers.authorization;
		const token = authHeader.split(' ')[1];
		const user = await findUser(`id = '${userId}'`);
		const decoded = verifyToken(token);
		try {

			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}
			const jwtUserProfileToken = decoded.profileToken;
			if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
				return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
			}
			return res.status(200).json({ message: 'Доступ разрешён' });
		} catch (error) {
			return res.status(500).json({message: 'Произошла ошибка при получении доступа к редактированию профиля'});
		}
	}  catch (error) {
		console.error('Ошибка при получении доступа к редактированию профиля:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
  const userId = req.params.userId;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
  }
  	const token = authHeader.split(' ')[1];
    const user = await findUser(`id = '${userId}'`);
	const decoded = verifyToken(token);
  try {

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
	const jwtUserProfileToken = decoded.profileToken;
	if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
		return res.status(403).json({message: 'Недостаточно прав.'});
	}
	const tempLogin = generateToken();
	const tempPassword = generateToken();
	const hashedPass = setHash(tempPassword); 
	const tempEmail = generateToken();
	updateUser(userId, "Deleted user", tempLogin, tempEmail);
	await db.promise().query('UPDATE users SET avatar = ? WHERE id = ?', [null, userId]);
	await db.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedPass, userId]);
	return res.status(200).json({ message: 'Пользователь успешно удалён' });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return res.status(500).json({ message: 'Произошла ошибка при удалении данных о пользователе' });
  }
  } catch(error) {
	  console.error('Ошибка при удалении пользователя:', error);
	  return res.status(401).json({message: 'Недействительный токен'})
  }
});

app.patch('/api/users/update/avatar', uploadAvatar.single('avatar'), async (req, res) => {
  try {
  const authHeader = req.headers.authorization;
  const avatar = req.file;
  	const token = authHeader.split(' ')[1];
	const decoded = verifyToken(token);
	const userId = decoded.userId;
	const target = req.headers.target;
  try {

    const user = await findUser(`id = '${userId}'`);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (target != user.id) {
      return res.status(403).json({ message: 'Недостаточно прав для редактирования профиля' });
    }

    if (!avatar) {
      return res.status(400).json({ message: 'Файл аватара не найден' });
    }
    const avatarPath = `uploads/${avatar.originalname}`;

    await db.promise().query('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, userId]);

    return res.status(200).json({ success: true });
  } catch(error) {
    console.error('Ошибка при обновлении данных пользователя:', error);
    return res.status(500).json({ message: 'Произошла ошибка при обновлении данных пользователя' });
  }
  } catch(error) {
	  console.error('Ошибка при обновлении данных пользователя:', error);
	  return res.status(401).json({ message: 'Недействительный токен' });
  }
});

app.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const offset = (page - 1) * perPage;
  
  const sortBy = req.query.sortBy || 'likes';
  const startDate = req.query.startDate || '';
  const endDate = req.query.endDate || '';
  const selectedStatus = req.query.selectedStatus || 'active';
  
  try{
    let query;
    let queryValues = [];

    query = 'SELECT posts.*, COUNT(likes.post_id) AS likes_count ' +
              'FROM posts LEFT JOIN likes ON posts.id = likes.post_id AND likes.type = ? ';
	queryValues.push('like');
	
	if (selectedStatus !== 'both') {
		query+='WHERE posts.status = ? ';
		queryValues.push(selectedStatus);
		
		if (startDate !== '' && endDate !== '') {
			query += 'AND publish_date BETWEEN ? AND ? ';
			queryValues.push(startDate, endDate);
		}
	} else {
		if (startDate !== '' && endDate !== '') {
			query += 'WHERE publish_date BETWEEN ? AND ? ';
			queryValues.push(startDate, endDate);
		}
	}
	if (sortBy === 'likes') {
		query += 'GROUP BY posts.id ORDER BY likes_count DESC';
	} else {
		query += 'GROUP BY posts.id ORDER BY posts.publish_date DESC';
	}
	
	query += ' LIMIT ? OFFSET ?';

	queryValues.push(perPage);
	queryValues.push(offset);
	
	const [posts, _] = await db.promise().query(query, queryValues);
	res.status(200).json(posts);
	
  }catch (error) {
    console.error('Ошибка во время получения списка публикаций: ', error);
    return res.status(500).json({ message: 'Произошла ошибка во время получения списка публикаций' });
  }
});

app.get('/api/posts/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const offset = (page - 1) * perPage;

  try {
    const [posts, _] = await db.promise().query('SELECT * FROM posts WHERE author_id = ? LIMIT ? OFFSET ?', [userId, perPage, offset]);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Ошибка во время получения списка публикаций: ', error);
    return res.status(500).json({ message: 'Произошла ошибка во время получения списка публикаций' });
  }
});

app.get('/api/category/:categoryId', async (req, res) => {
	const categoryId = parseInt(req.params.categoryId);
	try {
		const [category, _] = await db.promise().query('SELECT * FROM categories WHERE id = ?', [categoryId]);
		res.status(200).json(category);
	} catch (error) {
    console.error('Ошибка во время получения данных о категории: ', error);
    return res.status(500).json({ message: 'Произошла ошибка во время получения данных о категории' });
  }
});

app.get('/api/category/:categoryId/posts', async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const offset = (page - 1) * perPage;
  const status = req.query.status;

  try {
    let query = 'SELECT p.* FROM posts p ' +
                'INNER JOIN post_categories pc ON p.id = pc.post_id ' +
                'WHERE pc.category_id = ? ';

    const params = [categoryId];

    if (status) {
      query += 'AND p.status = ? ';
      params.push(status);
    }

    query += 'LIMIT ? OFFSET ?';

    const [posts, _] = await db.promise().query(query, [...params, perPage, offset]);
    res.status(200).json(posts);
  } catch (error) {
    console.error('Ошибка во время получения списка публикаций: ', error);
    return res.status(500).json({ message: 'Произошла ошибка во время получения списка публикаций' });
  }
});

app.post('/api/:calendarId/events', uploadPostFile.array('files'), async (req, res) => {
    const eventData = req.body;
    const publishDate = new Date();
	const authHeader = req.headers.authorization;
	const calendarIds = eventData.calendars;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(404).json({ message: 'Token not found' });
	}
	try {
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const authorId = decoded.userId;
		const profileToken = decoded.profileToken;
		const user = await findUser(`id = ${authorId}`);
		let color = !eventData.color ? '#ffffff' : eventData.color;
		let start; 
		let end;
		if (!user) {
			return res.status(404).json({ message: 'User not found' });
		}
		if (!eventData.startDate) {
			const eventDate = new Date(eventData.date);
			eventDate.setHours(0, 0, 0, 0);
			start = eventDate;
		} else {
			start = eventData.startDate;
		}
		if (!eventData.endDate) {
			const eventDate = new Date(eventData.date);
			eventDate.setHours(23, 59, 59, 99);
			end = eventDate;
		} else {
			end = eventData.endDate;
		}	  
		try {
			if (user.profile_token !== profileToken) {
				return res.status(403).json({ message: 'Недостаточно прав для создания event' });
			}
			const files = req.files.map(file => file.filename).join(", ");
				const [event, _] = await db.promise().query(
					'INSERT INTO events (name, color, content, start, end, type, date, file) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
					[eventData.title, color, eventData.content, start, end, eventData.type, publishDate, eventData.filenames]
					);
			const [eventNew] = await db.promise().query('SELECT LAST_INSERT_ID() AS id');
			
			await db.promise().query('INSERT INTO userevents (userId, eventId) VALUES (?, ?)', [authorId, eventNew[0].id]);
			const numbers = calendarIds.split(',');
			for (const calendarId of numbers) {
				if (calendarId !== ' ' && !isNaN(calendarId)) {
					await db.promise().query('INSERT INTO calendarevents (calendarId, eventId) VALUES (?, ?)', [calendarId, eventNew[0].id]);
				}
			}

				res.json({ message: 'Event успешно создан' });
			} catch (error) {
				console.error('Ошибка во время создания event: ', error);
				return res.status(500).json({ message: 'Произошла ошибка во время создания eventa' });
			}
	}catch(error) {
	console.error('Ошибка во время создания eventa: ', error);
	return res.status(401).json({ message: 'Недействительный токен' });
  }
});

app.delete('/api/:calendarId/calendars', async (req, res) => {
    const calendarId = req.params.calendarId;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`id = ${authorId}`);
    let isOwner = false;
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
    
    const sql = `SELECT isOwner FROM usercalendars WHERE userId = ? AND calendarId = ?`;
    const [result] = await db.promise().query(sql, [authorId, calendarId]);
  
    if (result.length > 0) {
        isOwner = result[0].isOwner;
    } else {
        return res.status(404).json({ message: 'Запись о не найдена' });
    }
    
    if (!isOwner) {
      try {
        await db.promise().query(
          'DELETE FROM usercalendars WHERE userId = ? AND calendarId = ?', 
          [authorId, calendarId]
        );
    
        res.json({ message: 'Calendar successfully removed' });
      } catch (error) {
        console.error('Error while removing calendar:', error);
        return res.status(500).json({ message: 'An error occurred while removing the calendar' });
      }
    } else {
      const [originCalendarData, _] = await db.promise().query('SELECT * FROM calendars WHERE id = ?',
        [calendarId]
      );
      if (originCalendarData[0].name === "Personal") {
        return res.status(400).json({ message: 'Personal calendar cannot be deleted' });
      }
      try {
        if (user.profile_token !== profileToken) {
          return res.status(403).json({ message: 'Недостаточно прав для удаления календаря' });
        }
		const eventsIds = await db.promise().query(
			'SELECT eventId FROM calendarevents WHERE calendarId = ?', 
			[calendarId]
		  );

        await db.promise().query(
          'DELETE FROM calendarevents WHERE calendarId = ?', 
          [calendarId]
        );

		if (eventsIds.length > 0) {
			const eventIdsArray = eventsIds[0].map(event => event.eventId);

			for (const eventId of eventIdsArray) {
				await db.promise().query(
					'DELETE FROM userevents WHERE eventId = ?', 
					[eventId]
				);
				await db.promise().query(
					'DELETE FROM events WHERE id = ?', 
					[eventId]
				);
			}
			
		}
        
        await db.promise().query(
          'DELETE FROM usercalendars WHERE calendarId = ?', 
          [calendarId]
        );
        
        await db.promise().query(
          'DELETE FROM calendars WHERE id = ?',
          [calendarId]
        );

        res.json({ message: 'Calendar успешно удален' });
      } catch (error) {
        console.error('Ошибка во время удаления календаря: ', error);
        return res.status(500).json({ message: 'Произошла ошибка во время удаления календаря' });
      }
    }
    } catch(error) {
        console.error('Ошибка во время удаления календаря: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});


app.delete('/api/:eventId/events', async (req, res) => {
    const eventId = req.params.eventId;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`id = ${authorId}`);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
		
		const [originEventData, _] = await db.promise().query('SELECT * FROM events WHERE id = ?',
			[eventId]
		);
        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'You have no permision for delete this event' });
            }
			await db.promise().query(
				'DELETE FROM calendarevents WHERE eventId = ?', 
				[eventId]
			);
			
			await db.promise().query(
				'DELETE FROM userevents WHERE eventId = ?', 
				[eventId]
			);
			
            await db.promise().query(
                'DELETE FROM events WHERE id = ?',
                [eventId]
            );

            res.json({ message: 'Event successffuly deleted' });
        } catch (error) {
            console.error('Error during deleting event: ', error);
            return res.status(500).json({ message: 'Error during deleting event' });
        }
    } catch(error) {
        console.error('Error during deleting event: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.patch('/api/:calendarId/calendars', async (req, res) => {
    const calendarId = req.params.calendarId;
    const calendarData = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`id = ${authorId}`);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
    
    const sql = `SELECT isOwner FROM usercalendars WHERE userId = ? AND calendarId = ?`;
    const [result] = await db.promise().query(sql, [authorId, calendarId]);
  
    if (result.length > 0) {
      const isOwner = result[0].isOwner;
      if (!isOwner) {
        return res.status(403).json({ message: 'Недостаточно прав для обновления календаря' });
      }
    } else {
      return res.status(404).json({ message: 'Запись о user не найдена' });
    }

    const [originCalendarData, _] = await db.promise().query('SELECT * FROM calendars WHERE id = ?',
      [calendarId]
    );
    if (originCalendarData[0].name !== "Personal" && calendarData.name === "Personal") {
      return res.status(400).json({ message: 'Calendar name can not be "Personal"' });
    }
        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Недостаточно прав для обновления календаря' });
            }
            await db.promise().query(
                'UPDATE calendars SET name = ?, color = ?, description = ? WHERE id = ?',
                [calendarData.name, calendarData.color, calendarData.description, calendarId]
            );

            res.json({ message: 'Calendar успешно обновлен' });
        } catch (error) {
            console.error('Ошибка во время обновления календаря: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время обновления календаря' });
        }
    } catch(error) {
        console.error('Ошибка во время обновления календаря: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.patch('/api/:eventId/events', async (req, res) => {
    const eventId = req.params.eventId;
    const eventData = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`id = ${authorId}`);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Недостаточно прав для обновления event' });
            }
            await db.promise().query(
                'UPDATE events SET name = ?, color = ?, content = ? WHERE id = ?',
                [eventData.name, eventData.color, eventData.content, eventId]
            );

            res.json({ message: 'Event успешно обновлен' });
        } catch (error) {
            console.error('Ошибка во время обновления event: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время обновления event' });
        }
    } catch(error) {
        console.error('Ошибка во время обновления event: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.post('/api/:userId/calendars', async (req, res) => {
    const calendarData = req.body;
    const publishDate = new Date();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Token not found' });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        const authorId = decoded.userId;
        const profileToken = decoded.profileToken;
        const user = await findUser(`id = ${authorId}`);
        const color = calendarData.color || '#ffffff';
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (calendarData.title === "Personal") {
            return res.status(400).json({ message: 'Calendar name can not be "Personal"' });
        }
        try {
            if (user.profile_token !== profileToken) {
                return res.status(403).json({ message: 'Недостаточно прав для создания calendar' });
            }
            const [calendar, _] = await db.promise().query(
                'INSERT INTO calendars (name, color, description, date) VALUES (?, ?, ?, ?)',
                [calendarData.title, color, calendarData.content, publishDate]
            );
            const [calendarNew] = await db.promise().query('SELECT LAST_INSERT_ID() AS id');
            await db.promise().query('INSERT INTO usercalendars (userId, calendarId) VALUES (?, ?)', [authorId, calendarNew[0].id]);

            res.json({ message: 'Calendar успешно создан' });
        } catch (error) {
            console.error('Ошибка во время создания calendar: ', error);
            return res.status(500).json({ message: 'Произошла ошибка во время создания calendara' });
        }
    } catch(error) {
        console.error('Ошибка во время создания calendara: ', error);
        return res.status(401).json({ message: 'Недействительный токен' });
    }
});

app.get('/api/files/:file', (req, res) => {
  const { file } = req.params;
  const filePath = path.resolve(process.cwd(), 'post_files', file);
  res.sendFile(filePath);
});
app.get('/api/posts/:postId/files', async (req, res) => {
	const { postId } = req.params;
	try {
		const [files, _] = await db.promise().query('SELECT * FROM post_files WHERE post_id = ?',
			[postId]
		);
		res.status(200).json(files);
		
	} catch (error) {
		console.error('Ошибка во время получения файлов публикации: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения файлов публикации'});
	}
});

app.get('/api/posts/:postId', async (req, res) => {
	const postId = req.params.postId;
	
	try {
		const [post, _] = await db.promise().query('SELECT * FROM posts WHERE id = ?',
			[postId]
		);
		res.status(200).json(post[0]);
	} catch (error) {
		console.error('Ошибка во время получения данных публикации: ', error);
		return res.status(500).json({message: 'Произошла ошибка во время получения данных публикации'});
	}
});

app.patch('/api/posts/:postId', uploadPostFile.array('files'), async (req, res) => {
	const postId = req.params.postId;
    const postData = req.body;
	const authHeader = req.headers.authorization;
  
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
	}
  try {
	const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const authorId = decoded.userId;
		const profileToken = decoded.profileToken;
	
    try {
		const user = await findUser(`id = ${authorId}`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		if (user.profile_token !== profileToken) {
			return res.status(403).json({ message: 'Недостаточно прав для редактирования публикации' });
		}
        const [post, _] = await db.promise().query(
            'UPDATE posts SET title = ?, description = ?, content = ? WHERE id = ?',
            [postData.title, postData.description, postData.content, authorId]
        );

		const categories = req.body.categories.split(',').map(category => Number(category));
		await db.promise().query('DELETE FROM post_categories WHERE post_id = ?', [postId])
		
		for (const category of categories) {
			if(category !== 0){
				await db.promise().query(
					'INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)',
					[postId, category]
				);
			}
		}

        const files = req.files;
        const filePaths = files.map(file => `post_files/${file.originalname}`);
		await db.promise().query('DELETE FROM post_files WHERE post_id = ?', [postId])
        for (const filePath of filePaths) {
            await db.promise().query(
                'INSERT INTO post_files (post_id, file_path) VALUES (?, ?)',
                [postId, filePath]
            );
        }

        res.status(200).json({ message: 'Пост успешно отредактирован' });
    } catch (error) {
        console.error('Ошибка во время редактирования публикации: ', error);
        return res.status(500).json({ message: 'Произошла ошибка во время редактирования публикации' });
    }
  } catch (error) {
	console.error('Ошибка во время редактирования публикации ', error);
	return res.status(401).json({message: 'Недействительный токен'});
  }
});
app.get('/api/:postId/categories', async (req, res) => {
    const postId = req.params.postId;

    try {
        const [categories, _] = await db.promise().query(
            'SELECT c.* FROM categories c JOIN post_categories pc ON c.id = pc.category_id WHERE pc.post_id = ?',
            [postId]
        );

        res.json(categories);
    } catch (error) {
        console.error('Ошибка при получении категорий: ', error);
        return res.status(500).json({ message: 'Произошла ошибка при получении категорий' });
    }
});


app.post('/api/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const { parentId, content } = req.body;
  const status = 'active';
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
  }
  try {
	const token = authHeader.split(' ')[1];
	const decoded = verifyToken(token);
	const authorId = decoded.userId;
	const profileToken = decoded.profileToken;
	const publishDate = new Date();

  try {
    const [comment] = await db.promise().query(
      'INSERT INTO comments (author_id, post_id, parent_id, content, publish_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [authorId, postId, parentId, content, publishDate, status]
    );
    const newCommentId = comment.insertId;
    const [newComment] = await db.promise().query('SELECT * FROM comments WHERE id = ?', [newCommentId]);
    res.status(201).json(newComment[0]);
  } catch (error) {
    console.error('Ошибка при добавлении комментария:', error);
    res.status(500).json({ message: 'Произошла ошибка при добавлении коментария.' });
  }
  } catch(error){
	console.error('Ошибка при добавлении комментария:', error);
    res.status(401).json({ message: 'Недействительный токен.' });
  }
  
});

app.get('/api/posts/:postId/comments', async (req, res) => {
	const { postId } = req.params;
	const page = parseInt(req.query.page) || 1;
	const perPage = parseInt(req.query.perPage) || 5;
	const offset = (page - 1) * perPage;
	const authHeader = req.headers.authorization;
	
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		try {
			const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE post_id = ? AND status = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [postId, 'active', perPage, offset]);
			res.status(200).json(comments);
		} catch (error) {
			console.error('Ошибка при получении комментариев:', error);
			res.status(500).json({ message: 'Произошла ошибка при получении комментариев' });
		}
	} else {
	try{
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		const authorId = decoded.userId;
		const profileToken = decoded.profileToken;
		const user = await findUser(`id = ${authorId}`);
		if (!user) {
			return res.status(404).json({ message: 'Пользователь не найден' });
		}
		if(user.role !== 'admin'){
			const [comments, _] = await db.promise().query(`(SELECT * FROM comments WHERE post_id = ? AND status = ?) UNION (SELECT * FROM comments WHERE author_id = ? AND post_id = ?) ORDER BY id DESC LIMIT ? OFFSET ?`, [postId, 'active', authorId, postId, perPage, offset]);
			res.status(200).json(comments);
		} else {
			const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE post_id = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [postId, perPage, offset]);
			res.status(200).json(comments);
		}
	} catch(error){
		const [comments, _] = await db.promise().query(`SELECT * FROM comments WHERE post_id = ? AND status = ? ORDER BY id DESC LIMIT ? OFFSET ?`, [postId, 'active', perPage, offset]);
		res.status(200).json(comments);
	}
	}
});


app.get('/api/comments/:commentId', async (req, res) => {
  const { commentId } = req.params;

  try {
    const [comments] = await db.promise().query('SELECT * FROM comments WHERE id = ?', [commentId]);
    res.status(200).json(comments);
  } catch (error) {
    console.error('Ошибка при получении комментария:', error);
    res.status(500).json({ message: 'Произошла ошибка при получении комментария' });
  }
});

app.patch('/api/status/posts/:postId', async (req, res) => {
	try {
		const { postId } = req.params;
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			const hasAccess = await checkUserAccessAdminPost(userId, postId, res);
			if (!hasAccess) {
			   return res.status(403).json({message: 'Недостаточно прав'});
			}
			const [fetchedStatus, _] = await db.promise().query('SELECT status FROM posts WHERE id = ?', [postId]);
			if(fetchedStatus[0].status === 'active'){
				await db.promise().query('UPDATE posts SET status = ? WHERE id = ?', ['inactive', postId]);
			} else {
				await db.promise().query('UPDATE posts SET status = ? WHERE id = ?', ['active', postId]);
			}
			res.status(200).json({ message: 'Статус публикации обновлен успешно' });
		} catch (error) {
			console.error('Ошибка при обновлении статуса публикации:', error);
			res.status(500).json({ message: 'Произошла ошибка при обновлении статуса публикации' });
		}
	} catch(error) {
		console.error('Ошибка при изменении статуса публикации:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.patch('/api/status/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			const hasAccess = await checkUserAccessAdminComment(userId, commentId, res);
			if (!hasAccess) {
			  return res.status(403).json({message: 'Недостаточно прав'});
			}
			const [fetchedStatus, _] = await db.promise().query('SELECT status FROM comments WHERE id = ?', [commentId]);
			if(fetchedStatus[0].status === 'active'){
				await db.promise().query('UPDATE comments SET status = ? WHERE id = ?', ['inactive', commentId]);
			} else {
				await db.promise().query('UPDATE comments SET status = ? WHERE id = ?', ['active', commentId]);
			}
			const [updatedStatus] = await db.promise().query('SELECT status FROM comments WHERE id = ?', [commentId]);
			res.status(200).json({ message: 'Статус комментария обновлен успешно', status: updatedStatus[0].status});
		} catch (error) {
			console.error('Ошибка при обновлении статуса комментария:', error);
			res.status(500).json({ message: 'Произошла ошибка при обновлении статуса комментария' });
		}
	} catch(error) {
		console.error('Ошибка при изменении статуса комментария:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.patch('/api/comments/:commentId', async (req, res) => {
  try {
  const { commentId } = req.params;
  const { content } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
	return res.status(404).json({ message: 'Токен не найден' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  try {
    const jwtUserProfileToken = decoded.profileToken;
    const userId = decoded.userId;

    const user = await findUser(`id = ${userId}`);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    if (user.profile_token !== jwtUserProfileToken) {
      return res.status(403).json({ message: 'Недостаточно прав' });
    }

    await db.promise().query('UPDATE comments SET content = ? WHERE id = ?', [content, commentId]);
    res.status(200).json({message: 'Комментарий успешно обновлен'});
  } catch (error) {
    console.error('Ошибка при обновлении комментария:', error);
    res.status(500).json({ message: 'Произошла ошибка при обновлении комментария' });
  }
  }catch(error) {
	console.error('Ошибка при добавлении комментария:', error);
    res.status(401).json({ message: 'Недействительный токен.' });
  }
});



app.delete('/api/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}

		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;

			const hasAccess = await checkUserAccessAdminComment(userId, commentId, res);
			if (!hasAccess) {
			  return res.status(403).json({message: 'Недостаточно прав'});
			}
			
			await db.promise().query('DELETE FROM likes WHERE comment_id = ?', [commentId]);
			await db.promise().query('DELETE FROM comments WHERE id = ?', [commentId]);
			res.status(200).json({ message: 'Комментарий удалён' });
		} catch (error) {
			console.error('Ошибка при удалении комментария:', error);
			res.status(500).json({ message: 'Произошла ошибка при удалении комментария' });
		}
	}catch(error) {
		console.error('Ошибка при удалении комментария:', error);
		res.status(401).json({ message: 'Недействительный токен.' });
	}
});

app.get('/api/search/users', async (req, res) => {
  try {
    const searchTerm = req.query.search;

	if(searchTerm == null || searchTerm == '') {
		return res.status(404).json({message: 'User not found'});
	}
const [usersResult] = await db.promise().query(
  'SELECT id, login, full_name, email, avatar FROM users WHERE login LIKE ?',
  [`%${searchTerm}%`]
);

const filteredUsers = usersResult.filter(user => user.full_name !== 'Deleted user');

    return res.status(200).json({ list: filteredUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch searched user' });
  }
});

app.get('/api/search/events', async (req, res) => {
	    try {
    const authHeader = req.headers.authorization;
        
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(404).json({ message: 'Токен не найден' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);


        const jwtUserProfileToken = decoded.profileToken;
        const userId = decoded.userId;
        const searchTerm = req.query.search;

        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(404).json({ message: 'Event not found' });
        }

const [eventsResult] = await db.promise().query(`
    SELECT e.name, e.content, ce.calendarId, c.name AS calendarName
    FROM events e 
    JOIN userevents ue ON e.id = ue.eventId 
    JOIN calendarevents ce ON e.id = ce.eventId
    JOIN calendars c ON ce.calendarId = c.id
    WHERE e.name LIKE ? AND ue.userId = ?
`, [`%${searchTerm}%`, userId]);

        return res.status(200).json({ list: eventsResult });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Failed to fetch searched user' });
    }
});



app.get('/api/like/posts/:postId', async (req, res) => {
	try {
		const { postId } = req.params;

		const likes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND post_id = ?`, ['like', postId]);
		const dislikes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND post_id = ?`, ['dislike', postId]);
		
		res.status(200).json({likes: likes[0], dislikes: dislikes[0]});
		
	}catch (error) {
			console.error('Ошибка получения реакций:', error);
			res.status(500).json({ error: 'Ошибка получения реакций' });
	}
});
 
app.post('/api/like/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    try {
      const jwtUserProfileToken = decoded.profileToken;
      const userId = decoded.userId;

      const user = await findUser(`id = ${userId}`);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      if (user.profile_token !== jwtUserProfileToken) {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }

      const [existingLikes] = await db.promise().query(
        'SELECT * FROM likes WHERE post_id = ? AND author_id = ?',
        [postId, userId]
      );

      if (existingLikes.length > 0) {
        const existingType = existingLikes[0].type;

        if (existingType !== type) {
          await db.promise().query(
            'UPDATE likes SET type = ? WHERE post_id = ? AND author_id = ?',
            [type, postId, userId]
          );
        }
      } else {
        await db.promise().query(
          'INSERT INTO likes (author_id, date, post_id, type) VALUES (?, NOW(), ?, ?)',
          [userId, postId, type]
        );
      }

      const [currentPostAuthor, _] = await db.promise().query(
          'SELECT author_id FROM posts WHERE id = ?',
          [postId]
      );
	  const [currentAuthorPosts, __] = await db.promise().query(
          'SELECT id FROM posts WHERE author_id = ?',
          [currentPostAuthor[0].author_id]
      );


const postIds = currentAuthorPosts.map((post) => post.id).join(',');

const likesDislikesQuery = `
  SELECT 
    SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) AS total_likes, 
    SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) AS total_dislikes 
  FROM 
    likes 
  WHERE 
    post_id IN (${postIds})
`;

const [likesDislikesResult] = await db.promise().query(likesDislikesQuery);
const totalLikes = likesDislikesResult[0].total_likes || 0;
const totalDislikes = likesDislikesResult[0].total_dislikes || 0;

const userRating = totalLikes - totalDislikes;

await db.promise().query(
  'UPDATE users SET rating = ? WHERE id = ?',
  [userRating, currentPostAuthor[0].author_id]
);

      return res.status(200).json({ message: 'Реакция успешно обновлена' });
    } catch (error) {
      console.error('Ошибка сохранения реакции:', error);
      return res.status(500).json({ error: 'Ошибка сохранения реакции' });
    }
  } catch (error) {
    console.error('Ошибка сохранения реакции:', error);
    return res.status(401).json({ message: 'Недействительный токен' });
  }
});



app.delete('/api/like/posts/:postId', async (req, res) => {  
	try {
		const { postId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			
			const user = await findUser(`id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			
			}
			await db.promise().query('DELETE FROM likes WHERE post_id = ? AND author_id = ?', [postId, userId])
			
			const [currentPostAuthor, _] = await db.promise().query(
				'SELECT author_id FROM posts WHERE id = ?',
				[postId]
			);
			const [currentAuthorPosts, __] = await db.promise().query(
				'SELECT id FROM posts WHERE author_id = ?',
				[currentPostAuthor[0].author_id]
			);

			const postIds = currentAuthorPosts.map((post) => post.id).join(',');

			const likesDislikesQuery = `
			  SELECT 
				SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) AS total_likes, 
				SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) AS total_dislikes 
			  FROM 
				likes 
			  WHERE 
				post_id IN (${postIds})
			`;

			const [likesDislikesResult] = await db.promise().query(likesDislikesQuery);
			const totalLikes = likesDislikesResult[0].total_likes || 0;
			const totalDislikes = likesDislikesResult[0].total_dislikes || 0;

			const userRating = totalLikes - totalDislikes;

			await db.promise().query(
			  'UPDATE users SET rating = ? WHERE id = ?',
			  [userRating, currentPostAuthor[0].author_id]
			);

			res.status(200).json({ message: 'Лайк успешно убран' });
		} catch (error) {
			console.error('Ошибка удаления лайка:', error);
			res.status(500).json({ error: 'Ошибка удаления лайка' });
		}
	} catch (error) {
		console.error('Ошибка удаления лайка:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.get('/api/like/comments/:commentId', async (req, res) => {
	try {
		const { commentId } = req.params;

		const likes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND comment_id = ?`, ['like', commentId]);
		const dislikes = await db.promise().query(`SELECT * FROM likes WHERE type = ? AND comment_id = ?`, ['dislike', commentId]);
		
		res.status(200).json({likes: likes[0], dislikes: dislikes[0]});
		
	}catch (error) {
			console.error('Ошибка получения реакций:', error);
			res.status(500).json({ error: 'Ошибка получения реакций' });
	}
});
 

app.post('/api/like/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ message: 'Токен не найден' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    try {
      const jwtUserProfileToken = decoded.profileToken;
      const userId = decoded.userId;

      const user = await findUser(`id = ${userId}`);
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      if (user.profile_token !== jwtUserProfileToken) {
        return res.status(403).json({ message: 'Недостаточно прав' });
      }

      const [existingLikes] = await db.promise().query(
        'SELECT * FROM likes WHERE comment_id = ? AND author_id = ?',
        [commentId, userId]
      );

      if (existingLikes.length > 0) {
        const existingType = existingLikes[0].type;

        if (existingType !== type) {
          await db.promise().query(
            'UPDATE likes SET type = ? WHERE comment_id = ? AND author_id = ?',
            [type, commentId, userId]
          );
        }
      } else {
        await db.promise().query(
          'INSERT INTO likes (author_id, date, comment_id, type) VALUES (?, NOW(), ?, ?)',
          [userId, commentId, type]
        );
      }

      return res.status(200).json({ message: 'Реакция успешно обновлена' });
    } catch (error) {
      console.error('Ошибка сохранения реакции:', error);
      return res.status(500).json({ error: 'Ошибка сохранения реакции' });
    }
  } catch (error) {
    console.error('Ошибка сохранения реакции:', error);
    return res.status(401).json({ message: 'Недействительный токен' });
  }
});



app.delete('/api/like/comments/:commentId', async (req, res) => {  
	try {
		const { commentId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			
			const user = await findUser(`id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken) {
				return res.status(403).json({ message: 'Недостаточно прав' });
			
			}
			await db.promise().query('DELETE FROM likes WHERE comment_id = ? AND author_id = ?', [commentId, userId])

			res.status(200).json({ message: 'Лайк успешно убран' });
		} catch (error) {
			console.error('Ошибка удаления лайка:', error);
			res.status(500).json({ error: 'Ошибка удаления лайка' });
		}
	} catch (error) {
		console.error('Ошибка удаления лайка:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});

app.delete('/api/posts/:postId', async (req, res) => {
		try {
		const { postId } = req.params;
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(404).json({ message: 'Токен не найден' });
		}
		
		const token = authHeader.split(' ')[1];
		const decoded = verifyToken(token);
		try {
			const jwtUserProfileToken = decoded.profileToken;
			const userId = decoded.userId;
			
			const user = await findUser(`id = ${userId}`);
			if (!user) {
				return res.status(404).json({ message: 'Пользователь не найден' });
			}

			if (user.profile_token !== jwtUserProfileToken && decoded.role !== 'admin') {
				return res.status(403).json({ message: 'Недостаточно прав' });
			
			}
			await db.promise().query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
			await db.promise().query('DELETE FROM post_files WHERE post_id = ?', [postId]);
			await db.promise().query('DELETE FROM likes WHERE post_id = ?', [postId]);
			const [comments] = await db.promise().query('SELECT * FROM comments WHERE post_id = ?', [postId]);

			for (const comment of comments) {
			  const commentId = comment.id;
			  await db.promise().query('DELETE FROM likes WHERE comment_id = ?', [commentId]);
			}
			
			await db.promise().query('DELETE FROM comments WHERE post_id = ?', [postId]);
			
			
			
			const [currentPostAuthor, _] = await db.promise().query(
				'SELECT author_id FROM posts WHERE id = ?',
				[postId]
			);
			const [currentAuthorPosts, __] = await db.promise().query(
				'SELECT id FROM posts WHERE author_id = ?',
				[currentPostAuthor[0].author_id]
			);

			const postIds = currentAuthorPosts.map((post) => post.id).join(',');

			const likesDislikesQuery = `
			  SELECT 
				SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) AS total_likes, 
				SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) AS total_dislikes 
			  FROM 
				likes 
			  WHERE 
				post_id IN (${postIds})
			`;

			const [likesDislikesResult] = await db.promise().query(likesDislikesQuery);
			const totalLikes = likesDislikesResult[0].total_likes || 0;
			const totalDislikes = likesDislikesResult[0].total_dislikes || 0;

			const userRating = totalLikes - totalDislikes;

			await db.promise().query(
			  'UPDATE users SET rating = ? WHERE id = ?',
			  [userRating, currentPostAuthor[0].author_id]
			);
			
			
			await db.promise().query('DELETE FROM posts WHERE id = ?', [postId]);
			res.status(200).json({ message: 'Публикация успешно удалена' });
		} catch (error) {
			console.error('Ошибка удаления публикации:', error);
			res.status(500).json({ error: 'Ошибка удаления публикации' });
		}
	} catch (error) {
		console.error('Ошибка удаления публикации:', error);
		return res.status(401).json({ message: 'Недействительный токен' });
	}
});



app.listen(PORT, () => {
	console.log(`API is running on port ${PORT}`);
});
