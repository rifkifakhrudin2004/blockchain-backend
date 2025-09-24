import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { User } from '../types';

export class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const { username, email, password, role = 'user', wallet_address } = req.body;

      // Validasi input
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
      }

      // Check if user exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      ) as any;

      if (existingUsers.length > 0) {
        return res.status(409).json({ message: 'User with this email or username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Insert user
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role, wallet_address) VALUES (?, ?, ?, ?, ?)',
        [username, email, password_hash, role, wallet_address]
      ) as any;

      const userId = result.insertId;

      // Generate JWT token with explicit typing
      const token = jwt.sign(
        { id: userId, username, email, role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: userId, username, email, role, wallet_address },
        token
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Error registering user' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Get user from database
      const [users] = await pool.execute(
        'SELECT id, username, email, password_hash, role, wallet_address FROM users WHERE email = ?',
        [email]
      ) as any;

      if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token with explicit typing
      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          wallet_address: user.wallet_address
        },
        token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error during login' });
    }
  };
}